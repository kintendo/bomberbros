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

	send_map = () ->
		io.sockets.in(game.name).emit 'game_map', {map: JSON.stringify(game.map), bros: JSON.stringify(game.bros)}

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

	socket.on 'move', (data) ->
		console.log "client req move #{data.direction}"
		game.moveBro(broNum, data.direction)
		send_map()

	socket.on 'plant', () ->
		# attempt to plant bomb at this char's pos
