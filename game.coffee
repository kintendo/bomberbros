Bro = require './bro.coffee'
Bomb = require './bomb.coffee'
Drop = require './drop.coffee'

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
		@flames = {}
		@populateCrates()
		@status = "off"

	leave: (broNum) ->
		@bros[broNum-1] = null

	addBro: ()->
		num = @bros.length + 1
		if num <= 4
			[x,y] = switch num
				when 1 then [0,0]
				when 2 then [12,10]
				when 3 then [12,0]
				when 4 then [0,10]
			bro = new Bro(num, x, y)
			@bros[num-1] = bro
			return num
		return 0

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
		for drop, i in @drops
			if drop.x is x and drop.y is y
				if drop.type is "flame"
					@bros[broNum-1].power+=1
				else if drop.type is "bomb"
					@bros[broNum-1].maxBombs+=1
				delete @drops[i]
				@drops.splice(i,1)
				break
		@bros[broNum-1].move(x,y,direction)

	killBro: (broNum) ->
		[x,y] = switch broNum
			when 1 then [0,0]
			when 2 then [12,10]
			when 3 then [12,0]
			when 4 then [0,10]
		@bros[broNum-1].move(x,y,"down")
		@bros[broNum-1].maxBombs = 2
		@bros[broNum-1].power = 1
		@bros[broNum-1].life -= 1
		if @bros[broNum-1].life <= 0
			@bros[broNum-1] = null

	plantBomb: (broNum) ->
		bro =  @bros[broNum-1]
		[x,y] = bro.gps()
		if bro.curBombs < bro.maxBombs
			if @getItemAt(x,y) isnt "B"
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
		for tile in [0...@map.length]
			if @map[tile] isnt "X"
				if Math.floor( Math.random()*4+1 ) isnt 1
					@map[tile] = "C"
		#clear a path
		path = [ [0,0],[1,0],[0,1], [12,0],[11,0],[12,1], [0,10],[0,9],[10,1], [12,10],[12,9],[11,10] ]
		for [x,y] in path
			@setItemAt(x,y,"0")

	addDrop: (x,y) ->
		switch Math.floor( Math.random()*5+1 )
			when 1
				drop = new Drop(x, y, "bomb")
				@drops.push(drop)
			when 2
				drop = new Drop(x,y, "flame")
				@drops.push(drop)

	flameOn: (x, y, power) ->
		coords = []
		coords.push([x,y])
		#left
		for num in [1..power]
			if @getItemAt(x-num,y) not in ["X","undefined", "B"]
				coords.push([x-num,y])
				if @getItemAt(x-num,y) is "C"
					@setItemAt(x-num,y, "0")
					@addDrop(x-num,y)
					break
			else break
		#right
		for num in [1..power]
			if @getItemAt(x+num,y) not in ["X","undefined", "B"]
				coords.push([x+num,y])
				if  @getItemAt(x+num,y) is "C"
					@setItemAt(x+num,y, "0") 
					@addDrop(x+num, y)
					break
			else break
		#up
		for num in [1..power]
			if @getItemAt(x,y-num) not in ["X","undefined", "B"]
				coords.push([x,y-num])
				if @getItemAt(x,y-num) is "C"
					@setItemAt(x,y-num, "0")
					@addDrop(x,y-num)
					break
			else break
		#down
		for num in [1..power]
			if @getItemAt(x,y+num) not in ["X","undefined", "B"]
				coords.push([x,y+num])
				if @getItemAt(x,y+num) is "C"
					@setItemAt(x,y+num, "0")
					@addDrop(x,y+num)
					break
			else break
		for [ex,why] in coords
			for bro in @bros
				if bro?
					[x,y] = bro.gps()
					if ex is x and why is y
						@killBro(bro.playerNum)
		@flames["#{x}-#{y}"] = coords
		return "#{x}-#{y}"

	flameOff: (flame) ->
		delete @flames[flame]

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
