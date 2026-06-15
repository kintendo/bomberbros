// Colyseus game server on the uWebSockets.js transport.
// The transport's express-compatible app serves the client and image assets,
// so HTTP and the realtime WebSocket share a single port.
// ==============================================================================
const path = require('path');
const { Server } = require('colyseus');
const { uWebSocketsTransport } = require('@colyseus/uwebsockets-transport');
const { BomberRoom } = require('./rooms/BomberRoom');

const transport = new uWebSocketsTransport();

// static assets
const http = transport.expressApp;
http.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
http.get('/images/:file', (req, res) => res.sendFile(path.join(__dirname, 'images', req.params.file)));

const gameServer = new Server({ transport });
gameServer.define('bomber', BomberRoom);

const listening = gameServer.listen(process.env.PORT || 5000);

module.exports = { gameServer, listening };
