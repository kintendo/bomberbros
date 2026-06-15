const { Schema, ArraySchema, MapSchema, defineTypes } = require('@colyseus/schema');

// Map legend:
//   X = block (indestructible)   C = crate (destructible)   0 = path
//   B = bomb                     O = recently exploded tile
const MAP_WIDTH = 13;

// Corner each player spawns at, keyed by player number (1-4).
const SPAWN_POINTS = {
  1: [0, 0],
  2: [12, 10],
  3: [12, 0],
  4: [0, 10],
};

function initialMap() {
  return [
    '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
    '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0',
    '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
    '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0',
    '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
    '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0',
    '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
    '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0',
    '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
    '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0', 'X', '0',
    '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
  ];
}

class Bro extends Schema {
  constructor(playerNum, x, y) {
    super();
    this.reset(playerNum, x, y);
  }

  // (re)spawn a player at a corner with default loadout
  reset(playerNum, x, y) {
    this.playerNum = playerNum;
    this.x = x;
    this.y = y;
    this.maxBombs = 2;       // default # of bombs at one time
    this.curBombs = 0;
    this.power = 1;          // default range of bomb
    this.direction = "down";
    this.life = 3;           // start at 3 health
    this.active = true;      // false once dead or the player has left
  }

  move(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
  }

  gps() {
    return [this.x, this.y];
  }
}
defineTypes(Bro, {
  playerNum: "uint8",
  x: "uint8",
  y: "uint8",
  maxBombs: "uint8",
  curBombs: "uint8",
  power: "uint8",
  direction: "string",
  life: "uint8",
  active: "boolean",
});

class Bomb extends Schema {
  constructor(owner, x, y, power) {
    super();
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.power = power;
  }
}
defineTypes(Bomb, { owner: "uint8", x: "uint8", y: "uint8", power: "uint8" });

class Drop extends Schema {
  constructor(x, y, type) {
    super();
    this.x = x;
    this.y = y;
    this.type = type;
  }

  gps() {
    return [this.x, this.y];
  }
}
defineTypes(Drop, { x: "uint8", y: "uint8", type: "string" });

class FlamePoint extends Schema {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }
}
defineTypes(FlamePoint, { x: "uint8", y: "uint8" });

// one bomb's worth of flame tiles, keyed in GameState.flames by "x-y"
class Flame extends Schema {
  constructor() {
    super();
    this.points = new ArraySchema();
  }
}
defineTypes(Flame, { points: [FlamePoint] });

// Authoritative game state + rules. All mutating methods change synced
// collections directly, so Colyseus broadcasts the deltas to every client.
class GameState extends Schema {
  // Side-effect free: the colyseus.js client reconstructs the replica via
  // `new GameState()`, so all game setup lives in init() (server only).
  constructor() {
    super();
    this.name = "";
    this.status = "off";
    this.map = new ArraySchema();
    this.bros = new ArraySchema();
    this.drops = new ArraySchema();
    this.bombs = new MapSchema();
    this.flames = new MapSchema();
  }

  // Build a fresh game board. Called once, on the server, in onCreate.
  init(name) {
    this.name = name;
    for (const cell of initialMap()) this.map.push(cell);
    this.populateCrates();
    return this;
  }

  leave(broNum) {
    const bro = this.bros[broNum - 1];
    if (bro) bro.active = false;
  }

  // Seat a player: reuse a freed seat if one exists, otherwise open a new
  // one (max 4). Returns the player number, or 0 when the game is full.
  addBro() {
    for (let i = 0; i < this.bros.length; i++) {
      if (!this.bros[i].active) {
        const num = i + 1;
        const [x, y] = SPAWN_POINTS[num];
        this.bros[i].reset(num, x, y);
        return num;
      }
    }
    const num = this.bros.length + 1;
    if (num > 4) return 0;
    const [x, y] = SPAWN_POINTS[num];
    this.bros.push(new Bro(num, x, y));
    return num;
  }

  moveBro(broNum, direction) {
    let [x, y] = this.bros[broNum - 1].gps();
    const blocked = ["X", "undefined", "B", "C"];
    switch (direction) {
      case "left":
        if (x > 0 && !blocked.includes(this.getItemAt(x - 1, y))) x -= 1;
        break;
      case "right":
        if (x < 12 && !blocked.includes(this.getItemAt(x + 1, y))) x += 1;
        break;
      case "up":
        if (y > 0 && !blocked.includes(this.getItemAt(x, y - 1))) y -= 1;
        break;
      case "down":
        if (y < 10 && !blocked.includes(this.getItemAt(x, y + 1))) y += 1;
        break;
    }
    // pick up any drop on the destination tile
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      if (drop.x === x && drop.y === y) {
        if (drop.type === "flame") {
          this.bros[broNum - 1].power += 1;
        } else if (drop.type === "bomb") {
          this.bros[broNum - 1].maxBombs += 1;
        }
        this.drops.splice(i, 1);
        break;
      }
    }
    this.bros[broNum - 1].move(x, y, direction);
  }

  killBro(broNum) {
    const [x, y] = SPAWN_POINTS[broNum];
    const bro = this.bros[broNum - 1];
    bro.move(x, y, "down");
    bro.maxBombs = 2;
    bro.power = 1;
    bro.life -= 1;
    if (bro.life <= 0) {
      bro.active = false;
    }
  }

  plantBomb(broNum) {
    const bro = this.bros[broNum - 1];
    const [x, y] = bro.gps();
    if (bro.curBombs >= bro.maxBombs) return null;
    if (this.getItemAt(x, y) === "B") return null;
    for (let num = 1; num <= bro.maxBombs; num++) {
      const id = `${broNum}-${num}`;
      if (this.bombs.has(id)) continue;
      this.bombs.set(id, new Bomb(broNum, x, y, bro.power));
      bro.curBombs++;
      this.setItemAt(x, y, "B");
      return id;
    }
    return null;
  }

  explodeBomb(bombName) {
    const bomb = this.bombs.get(bombName);
    this.bros[bomb.owner - 1].curBombs -= 1;
    this.setItemAt(bomb.x, bomb.y, "O");
    this.bombs.delete(bombName);
    return this.flameOn(bomb.x, bomb.y, bomb.power);
  }

  populateCrates() {
    for (let tile = 0; tile < this.map.length; tile++) {
      if (this.map[tile] !== "X" && Math.floor(Math.random() * 4 + 1) !== 1) {
        this.map[tile] = "C";
      }
    }
    // keep each spawn corner clear so players aren't trapped
    const path = [
      [0, 0], [1, 0], [0, 1],
      [12, 0], [11, 0], [12, 1],
      [0, 10], [0, 9], [1, 10],
      [12, 10], [12, 9], [11, 10],
    ];
    for (const [x, y] of path) {
      this.setItemAt(x, y, "0");
    }
  }

  addDrop(x, y) {
    switch (Math.floor(Math.random() * 5 + 1)) {
      case 1:
        this.drops.push(new Drop(x, y, "bomb"));
        break;
      case 2:
        this.drops.push(new Drop(x, y, "flame"));
        break;
    }
  }

  flameOn(x, y, power) {
    const coords = [[x, y]];
    // [dx, dy] for left, right, up, down
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of directions) {
      for (let num = 1; num <= power; num++) {
        const fx = x + dx * num;
        const fy = y + dy * num;
        const item = this.getItemAt(fx, fy);
        if (["X", "undefined", "B"].includes(item)) break;
        coords.push([fx, fy]);
        if (item === "C") {
          this.setItemAt(fx, fy, "0");
          this.addDrop(fx, fy);
          break;
        }
      }
    }
    // any bro standing on a flame tile takes a hit
    for (const [ex, ey] of coords) {
      for (const bro of this.bros) {
        if (!bro.active) continue;
        const [bx, by] = bro.gps();
        if (ex === bx && ey === by) {
          this.killBro(bro.playerNum);
        }
      }
    }
    const flame = new Flame();
    for (const [fx, fy] of coords) {
      flame.points.push(new FlamePoint(fx, fy));
    }
    const key = `${x}-${y}`;
    this.flames.set(key, flame);
    return key;
  }

  flameOff(flame) {
    this.flames.delete(flame);
  }

  getItemAt(x, y) {
    return this.map[y * MAP_WIDTH + x];
  }

  setItemAt(x, y, item) {
    this.map[y * MAP_WIDTH + x] = item;
  }
}
defineTypes(GameState, {
  name: "string",
  status: "string",
  map: ["string"],
  bros: [Bro],
  drops: [Drop],
  bombs: { map: Bomb },
  flames: { map: Flame },
});

module.exports = { GameState, Bro, Bomb, Drop, Flame, FlamePoint };
