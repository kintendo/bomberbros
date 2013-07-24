# sends index.html to each connection
# ==============================================================================
http = require 'http'
fs = require 'fs'

app = http.createServer (req,res)->
	fs.readFile "#{__dirname}/index.html", (err, data) ->
		if err
			res.writeHead(500)
			res.end('Error loading index.html')
		else
			res.writeHead(200)
			res.end(data)

io = require('socket.io').listen app
app.listen process.env.PORT

# logic accessible by all sockets
# ==============================================================================

Bro = require './bro.coffee'
Game = require './game.coffee'
games =  new Object

io.sockets.on 'connection', (socket) ->

	game = ""
	broNum = 0

	send_game_list = () ->
		game_list = []
		for key of games
			game_list.push(key)
		socket.emit 'game_list', {list: JSON.stringify(game_list)}

	send_game_list()

	send_map = (flame = []) ->
		io.sockets.in(game.name).emit 'game_map', {game: JSON.stringify(game)}

	lag = (flame) ->
		setTimeout ( () ->
			game.flameOff(flame)
			send_map()
		), 500

	socket.on 'create_game', (data) ->
		console.log "client req make #{data.name}"
		if not games[data.name]
			game = games[data.name] = new Game(data.name)
			broNum = game.addBro()
			socket.join(game.name)
			send_map()
		else
			socket.emit 'error', {message: "already exists"}

	socket.on 'join_game', (data) ->
		console.log "client req join #{data.name}"
		if games[data.name]
			game = games[data.name]
			broNum = game.addBro()
			socket.join(game.name)
			send_map()
		else
			socket.emit 'error', {message: "doesn't exist"}

	socket.on 'fetch_games', () ->
		send_game_list()

	socket.on 'start_game', () ->
		game.status = "on"
		io.sockets.in(game.name).emit 'start_game', {}

	socket.on 'move', (data) ->
		if game.status is "on"
			if game.bros[broNum-1].life > 0
				game.moveBro(broNum, data.direction)
				send_map()

	socket.on 'plant', () ->
		if game.status is "on"
			if game.bros[broNum-1].life > 0
				bomb = game.plantBomb(broNum)
				if bomb?
					send_map()
					setTimeout ( () =>
						flame = game.explodeBomb(bomb)
						send_map()
						lag(flame)
					), 3000

