class Bro
	constructor: (@playerNum, @x, @y) ->
		@maxBombs = 2 		# default # of bombs at one time
		@curBombs = 0
		@power = 1 			# default range of bomb
		@direction = "down"

	move: (x,y, direction) ->
		@x = x
		@y = y
		@direction = direction

	gps: () ->
		[@x,@y]

module.exports = Bro