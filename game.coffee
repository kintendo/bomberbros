Bro = require './bro.coffee'
Bomb = require './bomb.coffee'

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
		@bombs = {}
	
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
		[x,y] = @bros[broNum-1].gps()
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
		@bros[broNum-1].move(x,y,direction)

	plantBomb: (broNum) ->
		bro =  @bros[broNum-1]
		[x,y] = bro.gps()
		if bro.curBombs < bro.maxBombs
			for num in [1..bro.maxBombs]
				if @bombs["#{broNum}-#{num}"]? then continue
				else
					@bombs["#{broNum}-#{num}"] = new Bomb(broNum, x, y, bro.power)
					bro.curBombs++
					@setItemAt(x, y, "B")
					return "#{broNum}-#{num}"
		return null

	explodeBomb: (bombName) ->
		bomb = @bombs[bombName]
		@bros[bomb.owner-1].curBombs-=1
		@setItemAt(bomb.x, bomb.y, "O")
		delete @bombs[bombName]
		return @flameOn(bomb.x, bomb.y, bomb.power)

	populateCrates: () ->

	flameOn: (x, y, power) ->
		coords = []
		coords.push([x,y])
		#left
		for num in [1..power]
			if @getItemAt(x-num,y) not in ["X","undefined", "B", "C"]
				coords.push([x-num,y])
			else break
		#right
		for num in [1..power]
			if @getItemAt(x+num,y) not in ["X","undefined", "B", "C"]
				coords.push([x+num,y])
			else break
		#up
		for num in [1..power]
			if @getItemAt(x,y-num) not in ["X","undefined", "B", "C"]
				coords.push([x,y-num])
			else break
		#down
		for num in [1..power]
			if @getItemAt(x,y+num) not in ["X","undefined", "B", "C"]
				coords.push([x,y+num])
			else break
		return coords

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
