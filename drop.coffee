class Drop
	constructor: (@x, @y, @type) ->

	gps: () ->
		[@x, @y]

module.exports = Drop