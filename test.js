// In-process tests: game rules + Colyseus schema encode/decode round-trip.
// (uWS loopback isn't reachable across processes in this sandbox, so the
// realtime layer is validated by exercising the exact wire format here.)
const { Encoder, Decoder } = require('@colyseus/schema');
const { GameState } = require('./schema/state');

let passed = 0, failed = 0;
const check = (name, cond) => {
  if (cond) { passed++; console.log("PASS:", name); }
  else { failed++; console.log("FAIL:", name); }
};

// ---------------------------------------------------------------------------
// 1. Game rules (server-authoritative GameState logic)
// ---------------------------------------------------------------------------
console.log("\n# game rules");

let g = new GameState().init("u");
check("fresh map has 143 tiles", g.map.length === 143);
const nums = [g.addBro(), g.addBro(), g.addBro(), g.addBro(), g.addBro()];
check("addBro seats 1..4 then 0 (full)", JSON.stringify(nums) === JSON.stringify([1, 2, 3, 4, 0]));
check("bro1 spawns [0,0]", g.bros[0].x === 0 && g.bros[0].y === 0);
check("bro2 spawns [12,10]", g.bros[1].x === 12 && g.bros[1].y === 10);

// freed seat is reused
g.leave(2);
check("leave marks bro2 inactive", g.bros[1].active === false);
check("addBro reuses freed seat 2", g.addBro() === 2 && g.bros[1].active === true);

// movement blocked by a wall
g = new GameState().init("v");
g.addBro();
g.bros[0].move(0, 0, "down");
g.setItemAt(1, 0, "X");
g.moveBro(1, "right");
check("move into 'X' blocked", g.bros[0].x === 0);

// plant + explode clears a crate and damages a bro
g = new GameState().init("w");
g.addBro();
g.bros[0].power = 2;
g.setItemAt(1, 0, "0"); g.setItemAt(2, 0, "C");
const id = g.plantBomb(1);
check("plantBomb returns '1-1'", id === "1-1");
check("bomb tracked in state.bombs", g.bombs.has("1-1"));
check("tile under bomb is 'B'", g.getItemAt(0, 0) === "B");
const key = g.explodeBomb(id);
check("explode returns origin key", key === "0-0");
check("bomb removed after explode", !g.bombs.has("1-1"));
check("crate at (2,0) destroyed", g.getItemAt(2, 0) === "0");
check("flame recorded", g.flames.has("0-0") && g.flames.get("0-0").points.length >= 1);
check("bro on origin took damage", g.bros[0].life === 2);
g.flameOff("0-0");
check("flameOff clears flame", !g.flames.has("0-0"));

// ---------------------------------------------------------------------------
// 2. Schema encode -> decode round-trip (what Colyseus syncs over the wire)
// ---------------------------------------------------------------------------
console.log("\n# schema sync round-trip");

const server = new GameState().init("alpha");
const encoder = new Encoder(server);
const replica = new GameState();
const decoder = new Decoder(replica);

const sync = (all = false) => {
  decoder.decode(all ? encoder.encodeAll() : encoder.encode());
  encoder.discardChanges();
};

sync(true); // initial full state
check("replica name synced", replica.name === "alpha");
check("replica map fully synced (143)", replica.map.length === 143);
check("replica map matches server cell-for-cell",
  replica.map.every((c, i) => c === server.map[i]));

// seat two players, start, move, plant -> deltas
server.addBro();
server.addBro();
server.status = "on";
server.moveBro(1, "down");
sync();
check("replica got both bros", replica.bros.length === 2);
check("replica status synced to 'on'", replica.status === "on");
check("replica bro1 moved to y=1 (map-cell + field delta synced)", replica.bros[0].y === 1);

// a map cell write (setItemAt via bracket assignment) must propagate
server.setItemAt(5, 5, "B");
sync();
check("replica map cell (5,5) synced to 'B'", replica.map[5 * 13 + 5] === "B");

// bombs (MapSchema) + flames (nested ArraySchema of Schema) sync
server.bros[0].power = 2;
const bid = server.plantBomb(1);
sync();
check("replica sees planted bomb in MapSchema", replica.bombs.has(bid));
const fkey = server.explodeBomb(bid);
sync();
check("replica bomb removed after explode", !replica.bombs.has(bid));
check("replica sees flame with points (nested schema)",
  replica.flames.has(fkey) && replica.flames.get(fkey).points.length >= 1);

// leaving frees a seat -> active flag delta syncs
server.leave(2);
sync();
check("replica sees bro2 inactive", replica.bros[1].active === false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
