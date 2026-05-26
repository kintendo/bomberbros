/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class Drop {
	constructor(x, y, type) {
		this.x = x;
		this.y = y;
		this.type = type;
	}

	gps() {
		return [this.x, this.y];
	}
}

module.exports = Drop;