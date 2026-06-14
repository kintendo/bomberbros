// sends index.html to each connection
// ==============================================================================
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.use('/images', express.static(__dirname + '/images'));

server.listen(process.env.PORT || 5000);

// logic accessible by all sockets
// ==============================================================================
const Game = require('./game');
const games = {};

io.on('connection', (socket) => {
  let game = "";
  let broNum = 0;

  const sendGameList = () => {
    socket.emit('game_list', { list: JSON.stringify(Object.keys(games)) });
  };

  const sendMap = () => {
    io.in(game.name).emit('game_map', { game: JSON.stringify(game) });
  };

  // clear a bomb's flames shortly after it goes off, then redraw
  const lag = (flame) => {
    setTimeout(() => {
      game.flameOff(flame);
      sendMap();
    }, 500);
  };

  sendGameList();

  socket.on('create_game', (data) => {
    if (games[data.name]) {
      socket.emit('error', { message: "already exists" });
      return;
    }
    game = games[data.name] = new Game(data.name);
    broNum = game.addBro();
    socket.join(game.name);
    sendMap();
  });

  socket.on('join_game', (data) => {
    if (!games[data.name]) {
      socket.emit('error', { message: "doesn't exist" });
      return;
    }
    game = games[data.name];
    broNum = game.addBro();
    if (!broNum) {
      socket.emit('error', { message: "game full" });
      return;
    }
    socket.join(game.name);
    if (game.status === "on") {
      socket.emit('start_game', {});
    }
    sendMap();
  });

  socket.on('fetch_games', () => sendGameList());

  socket.on('start_game', () => {
    game.status = "on";
    io.in(game.name).emit('start_game', {});
  });

  socket.on('move', (data) => {
    if (game.status === "on" && game.bros[broNum - 1] != null) {
      game.moveBro(broNum, data.direction);
      sendMap();
    }
  });

  socket.on('plant', () => {
    if (game.status !== "on" || game.bros[broNum - 1] == null) return;
    const bomb = game.plantBomb(broNum);
    if (bomb == null) return;
    sendMap();
    setTimeout(() => {
      const flame = game.explodeBomb(bomb);
      sendMap();
      lag(flame);
    }, 3000);
  });

  // drop this player; tear the game down once everyone has left
  const handleLeave = () => {
    if (!game) return;
    game.leave(broNum);
    for (const bro of game.bros) {
      if (bro != null) return sendMap();
    }
    delete games[game.name];
  };

  socket.on('quit', handleLeave);
  socket.on('disconnect', handleLeave);
});
