/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class Bro {
	constructor(playerNum, x, y) {
		this.playerNum = playerNum;
		this.x = x;
		this.y = y;
		this.maxBombs = 2; 		// default # of bombs at one time
		this.curBombs = 0;
		this.power = 1; 			// default range of bomb
		this.direction = "down";
		this.life = 3;			// start at 3 health
	}

	move(x,y, direction) {
		this.x = x;
		this.y = y;
		return this.direction = direction;
	}

	gps() {
		return [this.x,this.y];
	}
}

module.exports = Bro;