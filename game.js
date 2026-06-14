const Bro = require('./bro');
const Bomb = require('./bomb');
const Drop = require('./drop');

// Map legend:
//   X = block (indestructible)   C = crate (destructible)   0 = path
//   B = bomb                     O = recently exploded tile
const MAP_WIDTH = 13;

// Corner each player spawns at, keyed by player number.
const SPAWN_POINTS = {
  1: [0, 0],
  2: [12, 10],
  3: [12, 0],
  4: [0, 10],
};

class Game {
  constructor(name) {
    this.name = name;
    this.map = [
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
    this.bros = [];
    this.drops = [];
    this.bombs = {};
    this.flames = {};
    this.populateCrates();
    this.status = "off";
  }

  leave(broNum) {
    this.bros[broNum - 1] = null;
  }

  addBro() {
    const num = this.bros.length + 1;
    if (num > 4) return 0;
    const [x, y] = SPAWN_POINTS[num];
    this.bros[num - 1] = new Bro(num, x, y);
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
      this.bros[broNum - 1] = null;
    }
  }

  plantBomb(broNum) {
    const bro = this.bros[broNum - 1];
    const [x, y] = bro.gps();
    if (bro.curBombs >= bro.maxBombs) return null;
    if (this.getItemAt(x, y) === "B") return null;
    for (let num = 1; num <= bro.maxBombs; num++) {
      const id = `${broNum}-${num}`;
      if (this.bombs[id] != null) continue;
      this.bombs[id] = new Bomb(broNum, x, y, bro.power);
      bro.curBombs++;
      this.setItemAt(x, y, "B");
      return id;
    }
    return null;
  }

  explodeBomb(bombName) {
    const bomb = this.bombs[bombName];
    this.bros[bomb.owner - 1].curBombs -= 1;
    this.setItemAt(bomb.x, bomb.y, "O");
    delete this.bombs[bombName];
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
        if (bro == null) continue;
        const [bx, by] = bro.gps();
        if (ex === bx && ey === by) {
          this.killBro(bro.playerNum);
        }
      }
    }
    this.flames[`${x}-${y}`] = coords;
    return `${x}-${y}`;
  }

  flameOff(flame) {
    delete this.flames[flame];
  }

  getItemAt(x, y) {
    return this.map[y * MAP_WIDTH + x];
  }

  setItemAt(x, y, item) {
    this.map[y * MAP_WIDTH + x] = item;
  }
}

module.exports = Game;
