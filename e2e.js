// Real client<->server E2E in one process. This sandbox can't reach uWS's
// all-interface bind across processes, so we build the server inline (mirroring
// app.js) and patch *this* app instance's prototype to bind loopback, then
// drive it with the colyseus.js client exactly the way index.html does.
const path = require('path');
const http = require('http');
const { Server, matchMaker } = require('colyseus');
const { uWebSocketsTransport } = require('@colyseus/uwebsockets-transport');
const { BomberRoom } = require('./rooms/BomberRoom');

global.WebSocket = require('ws');
const { Client } = require('colyseus.js');

const PORT = 5412;

const transport = new uWebSocketsTransport();
const proto = Object.getPrototypeOf(transport.app); // per-instance prototype
const origListen = proto.listen;
proto.listen = function (...a) {
  return (typeof a[0] === 'number') ? origListen.call(this, '127.0.0.1', a[0], a[1]) : origListen.apply(this, a);
};

// same static routes as app.js
const httpApp = transport.expressApp;
httpApp.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
httpApp.get('/images/:file', (req, res) => res.sendFile(path.join(__dirname, 'images', req.params.file)));
httpApp.get('/rooms', async (req, res) => {
  const rooms = await matchMaker.query({ name: 'bomber' });
  res.json(rooms.map((r) => ({ roomId: r.roomId, name: (r.metadata && r.metadata.name) || r.roomId, clients: r.clients, maxClients: r.maxClients, locked: r.locked })));
});

const gameServer = new Server({ transport });
gameServer.define('bomber', BomberRoom);
const listening = gameServer.listen(PORT);

let failed = 0;
const check = (n, c) => { console.log((c ? "PASS" : "FAIL") + ":", n); if (!c) failed++; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const get = (p) => new Promise((res) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, len: b.length }));
  }).on('error', e => res({ status: 0, err: e.code }));
});

(async () => {
  await listening;
  await wait(200);

  const idx = await get('/');
  check("GET / serves index.html", idx.status === 200 && idx.len > 0);
  const img = await get('/images/cube.png');
  check("GET /images/cube.png serves an image (route param works)", img.status === 200 && img.len > 0);

  const client = new Client(`ws://127.0.0.1:${PORT}`);
  const room = await client.create("bomber", { name: "alpha" });
  // register exactly like index.html's enterRoom (right after create resolves)
  let initialRenders = 0;
  room.onStateChange(() => initialRenders++);
  await wait(400);
  check("onStateChange fires for initial state (board draws on entry)", initialRenders > 0);

  // exercise the EXACT access patterns index.html render() uses
  check("state.map: forEach + 143 tiles", typeof room.state.map.forEach === "function" && room.state.map.length === 143);
  let crates = 0, walls = 0;
  room.state.map.forEach((t) => { if (t === "C") crates++; if (t === "X") walls++; });
  check("map decoded with walls + crates", walls > 0 && crates > 0);

  check("state.bros iterable, creator present", typeof room.state.bros.forEach === "function" && room.state.bros.length === 1);
  let bro = null;
  room.state.bros.forEach((b, i) => { if (i === 0) bro = b; });
  check("bro fields readable", bro && bro.playerNum === 1 && bro.x === 0 && bro.direction === "down" && bro.active === true);
  check("state.bombs/flames MapSchema", typeof room.state.bombs.forEach === "function" && typeof room.state.flames.forEach === "function");

  // lobby listing via the /rooms endpoint (what fetch_games uses)
  const avail = JSON.parse((await new Promise((res) => {
    http.get({ host: '127.0.0.1', port: PORT, path: '/rooms' }, (r) => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); });
  })));
  check("/rooms lists this room w/ name", Array.isArray(avail) && avail.some(r => r.roomId === room.roomId && r.name === "alpha"));

  let renders = 0; room.onStateChange(() => renders++);
  let gotStart = false; room.onMessage("start_game", () => { gotStart = true; });
  room.send("start");
  await wait(200);
  const y0 = room.state.bros[0].y;
  room.send("move", { direction: "down" });
  await wait(300);
  check("start_game msg received", gotStart);
  check("status on + bro moved + onStateChange fired", room.state.status === "on" && room.state.bros[0].y === y0 + 1 && renders > 0);

  // plant -> after the fuse, client should see flames with points (render reads flame.points)
  room.send("plant");
  await wait(3300);
  let flamePoints = 0;
  room.state.flames.forEach((flame) => { flame.points.forEach(() => flamePoints++); });
  check("client decoded flames with points after explosion", room.state.flames.size >= 1 && flamePoints >= 1);

  await room.leave();
  console.log(failed ? `\n${failed} FAILED` : "\nALL PASS");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error("E2E ERROR:", e); process.exit(2); });
