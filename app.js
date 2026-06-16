// Colyseus game server on the uWebSockets.js transport.
// The transport's express-compatible app serves the client and image assets,
// so HTTP and the realtime WebSocket share a single port.
// ==============================================================================
const path = require('path');
const { Server, matchMaker } = require('colyseus');
const { uWebSocketsTransport } = require('@colyseus/uwebsockets-transport');
const { BomberRoom } = require('./rooms/BomberRoom');

const transport = new uWebSocketsTransport();

// static assets
const http = transport.expressApp;
http.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
http.get('/images/:file', (req, res) => res.sendFile(path.join(__dirname, 'images', req.params.file)));

// lobby listing for the client (colyseus.js 0.16 has no getAvailableRooms)
http.get('/rooms', async (req, res) => {
  const rooms = await matchMaker.query({ name: 'bomber' });
  res.json(rooms.map((r) => ({
    roomId: r.roomId,
    name: (r.metadata && r.metadata.name) || r.roomId,
    clients: r.clients,
    maxClients: r.maxClients,
    locked: r.locked,
  })));
});

const gameServer = new Server({ transport });
gameServer.define('bomber', BomberRoom);

// 2567 is Colyseus's conventional port; avoids the macOS AirPlay clash on 5000.
const port = Number(process.env.PORT) || 2567;
const listening = gameServer.listen(port).then(() => {
  // the uWS transport reports "listening" even when the bind fails, so check
  // the socket ourselves and fail loudly instead of hanging silently.
  if (!transport._listeningSocket) {
    console.error(`\n✗ Could not bind port ${port} — already in use? ` +
      `(macOS AirPlay Receiver uses 5000.) Try: PORT=<free port> npm start\n`);
    process.exit(1);
  }
  console.log(`\n▶ Bomber Bros running — open http://localhost:${port}\n`);
});

module.exports = { gameServer, listening };
