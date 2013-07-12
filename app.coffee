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