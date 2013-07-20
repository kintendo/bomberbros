Bro = require './bro.coffee'

class Game
	constructor: (@name)->
		@map = [ '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' ]
		@bros = []
		@drops = []
		@bombs = []
	
	addBro: ()->
		broNum = @bros.length + 1
		if broNum <= 4
			[x,y] = switch broNum
				when 1 then [0,0]
				when 2 then [12,10]
				when 3 then [12,0]
				when 4 then [0,10]
			bro = new Bro(broNum, x, y)
			@bros.push(bro)
			return broNum
		else return 0

	moveBro: (broNum, direction) ->
		[x,y] = @bros[broNum-1].get_pos()
		@setItemAt(x, y, "0")
		switch direction
			when "left" 
				if @getItemAt(x-1,y) not in ["X","undefined", "B", "C"]
					if x > 0 then x = x - 1
			when "right"
				if @getItemAt(x+1,y) not in ["X","undefined", "B", "C"]
					if x < 12 then x = x + 1
			when "up"
				if @getItemAt(x,y-1) not in ["X","undefined", "B", "C"]
					if y > 0 then y = y - 1
			when "down"
				if @getItemAt(x,y+1) not in ["X","undefined", "B", "C"]
					if y < 10 then y = y + 1
		@setItemAt(x, y, "P")
		@bros[broNum-1].move(x,y,direction)

	placeBomb: (broNum, x,y) ->

	populateCrates: () ->

	getItemAt: (x,y) ->
		@map[y*13+x]

	setItemAt: (x, y,item) ->
		@map[y*13+x] = item

###
	legend:
	P = player
	D = drop
	X = block
	0 = path
	B = bomb
	C = crate
###

module.exports = Game
