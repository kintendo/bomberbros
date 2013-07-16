Bro = require './bro.coffee'

class Game
	constructor: (@name)->
		@map = [ '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' ,' 0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' ,' 0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' ,' 0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' ,' 0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' ,' 0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' ,' 0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' ,' 0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' ,' 0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' ,' 0' , '0' , '0' , '0' , '0'
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' ,' 0' , 'X' , '0' , 'X' , '0'
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' ,' 0' , '0' , '0' , '0' , '0' ]
		@bros = []
	
	addBro: ()->
		broNum = @bros.length + 1
		if broNum <= 4
			[x,y] = switch broNum
				when 1 then [0,0]
				when 2 then [13,10]
				when 3 then [13,0]
				when 4 then [0,10]
			bro = new Bro(broNum, x, y)
			@setItemAt(x, y, "P#{broNum}")
			@bros.push(bro)

	placeBomb: (x,y)->

	getItemAt: (x,y) ->
		@map[y*13+x]

	setItemAt: (x, y,item) ->
		@map[y*13+x] = item

###
	legend:
	P1-4 = players 1-4
	D b f = drop bomb, flame
	X = block
	0 = walkable
	B1-4 = bomb for players 1-4
	o = burnable block?
###

module.exports = Game
