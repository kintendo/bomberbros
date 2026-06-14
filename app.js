/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// sends index.html to each connection
// ==============================================================================
const http = require('http');
const fs = require('fs');
const express = require('express');
const app = express();
const server = http.createServer(app);
const io = require('socket.io').listen(server);
io.set('log level', 1);

app.get('/', (req, res) => res.sendfile(__dirname + '/index.html'));

app.use('/images', express.static(__dirname + '/images'));

server.listen(process.env.PORT);

// logic accessible by all sockets
// ==============================================================================

const Bro = require('./bro');
const Game = require('./game');
const games =  new Object;

io.sockets.on('connection', function(socket) {

	let game = "";
	let broNum = 0;

	const send_game_list = function() {
		const game_list = [];
		for (var key in games) {
			game_list.push(key);
		}
		return socket.emit('game_list', {list: JSON.stringify(game_list)});
	};

	send_game_list();

	const send_map = function(flame) {
		if (flame == null) { flame = []; }
		return io.sockets.in(game.name).emit('game_map', {game: JSON.stringify(game)});
	};

	const lag = flame => setTimeout(( function() {
        game.flameOff(flame);
        return send_map();
    }), 500);

	socket.on('create_game', function(data) {
		if (!games[data.name]) {
			game = (games[data.name] = new Game(data.name));
			broNum = game.addBro();
			socket.join(game.name);
			return send_map();
		} else {
			return socket.emit('error', {message: "already exists"});
		}
});

	socket.on('join_game', function(data) {
		if (games[data.name]) {
			game = games[data.name];
			broNum = game.addBro();
			if (broNum) {
				socket.join(game.name);
				if (game.status === "on") {
					socket.emit('start_game', {});
				}
				return send_map();
			} else {
				return socket.emit('error', {message: "game full"});
			}
		} else {
			return socket.emit('error', {message: "doesn't exist"});
		}
});

	socket.on('fetch_games', () => send_game_list());

	socket.on('start_game', function() {
		game.status = "on";
		return io.sockets.in(game.name).emit('start_game', {});
});

	socket.on('move', function(data) {
		if (game.status === "on") {
			if (game.bros[broNum-1] != null) {
				game.moveBro(broNum, data.direction);
				return send_map();
			}
		}
	});

	socket.on('plant', function() {
		if (game.status === "on") {
			if (game.bros[broNum-1] != null) {
				const bomb = game.plantBomb(broNum);
				if (bomb != null) {
					send_map();
					return setTimeout(( () => {
						const flame = game.explodeBomb(bomb);
						send_map();
						return lag(flame);
					}
					), 3000);
				}
			}
		}
	});

	socket.on('quit', function() {
		if (game) {
			game.leave(broNum);
			for (var bro of Array.from(game.bros)) {
				if (bro != null) { return send_map(); }
			}
			return delete games[game.name];
		}
});

	return socket.on('disconnect', function() {
		if (game) {
			game.leave(broNum);
			for (var bro of Array.from(game.bros)) {
				if (bro != null) { return send_map(); }
			}
			return delete games[game.name];
		}
});
});
