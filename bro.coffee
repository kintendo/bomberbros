class Bro
	constructor: (@playerNum, @x, @y) ->
		@numBombs = 2 		# default # of bombs at one time
		@power = 2 			# default range of bomb
		@direction = "down"

	move: (x,y, direction) ->
		@x = x
		@y = y
		@direction = direction

	get_pos: () ->
		[@x,@y]
	
	set_pos:(x,y) ->
		@x = x
		@y = y

#white black blue red

module.exports = Bro