/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS202: Simplify dynamic range loops
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Bro = require('./bro');
const Bomb = require('./bomb');
const Drop = require('./drop');

class Game {
	constructor(name){
		this.name = name;
		this.map = [ '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0',
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0',
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0',
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0',
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0',
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0',
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0',
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0',
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0',
				 '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0' , 'X' , '0',
				 '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' , '0' ];
		this.bros = [];
		this.drops = [];
		this.bombs = {};
		this.flames = {};
		this.populateCrates();
		this.status = "off";
	}

	leave(broNum) {
		return this.bros[broNum-1] = null;
	}

	addBro(){
		const num = this.bros.length + 1;
		if (num <= 4) {
			const [x,y] = Array.from((() => { switch (num) {
				case 1: return [0,0];
				case 2: return [12,10];
				case 3: return [12,0];
				case 4: return [0,10];
			} })());
			const bro = new Bro(num, x, y);
			this.bros[num-1] = bro;
			return num;
		}
		return 0;
	}

	moveBro(broNum, direction) {
		let needle, needle1, needle2, needle3;
		let [x,y] = Array.from(this.bros[broNum-1].gps());
		switch (direction) {
			case "left":
				if ((needle = this.getItemAt(x-1,y), !["X","undefined", "B", "C"].includes(needle))) {
					if (x > 0) { x = x - 1; }
				}
				break;
			case "right":
				if ((needle1 = this.getItemAt(x+1,y), !["X","undefined", "B", "C"].includes(needle1))) {
					if (x < 12) { x = x + 1; }
				}
				break;
			case "up":
				if ((needle2 = this.getItemAt(x,y-1), !["X","undefined", "B", "C"].includes(needle2))) {
					if (y > 0) { y = y - 1; }
				}
				break;
			case "down":
				if ((needle3 = this.getItemAt(x,y+1), !["X","undefined", "B", "C"].includes(needle3))) {
					if (y < 10) { y = y + 1; }
				}
				break;
		}
		for (let i = 0; i < this.drops.length; i++) {
			var drop = this.drops[i];
			if ((drop.x === x) && (drop.y === y)) {
				if (drop.type === "flame") {
					this.bros[broNum-1].power+=1;
				} else if (drop.type === "bomb") {
					this.bros[broNum-1].maxBombs+=1;
				}
				delete this.drops[i];
				this.drops.splice(i,1);
				break;
			}
		}
		return this.bros[broNum-1].move(x,y,direction);
	}

	killBro(broNum) {
		const [x,y] = Array.from((() => { switch (broNum) {
			case 1: return [0,0];
			case 2: return [12,10];
			case 3: return [12,0];
			case 4: return [0,10];
		} })());
		this.bros[broNum-1].move(x,y,"down");
		this.bros[broNum-1].maxBombs = 2;
		this.bros[broNum-1].power = 1;
		this.bros[broNum-1].life -= 1;
		if (this.bros[broNum-1].life <= 0) {
			return this.bros[broNum-1] = null;
		}
	}

	plantBomb(broNum) {
		const bro =  this.bros[broNum-1];
		const [x,y] = Array.from(bro.gps());
		if (bro.curBombs < bro.maxBombs) {
			if (this.getItemAt(x,y) !== "B") {
				for (let num = 1, end = bro.maxBombs, asc = 1 <= end; asc ? num <= end : num >= end; asc ? num++ : num--) {
					if (this.bombs[`${broNum}-${num}`] != null) { continue;
					} else {
						this.bombs[`${broNum}-${num}`] = new Bomb(broNum, x, y, bro.power);
						bro.curBombs++;
						this.setItemAt(x, y, "B");
						return `${broNum}-${num}`;
					}
				}
			}
		}
		return null;
	}

	explodeBomb(bombName) {
		const bomb = this.bombs[bombName];
		this.bros[bomb.owner-1].curBombs-=1;
		this.setItemAt(bomb.x, bomb.y, "O");
		delete this.bombs[bombName];
		return this.flameOn(bomb.x, bomb.y, bomb.power);
	}

	populateCrates() {
		for (let tile = 0, end = this.map.length, asc = 0 <= end; asc ? tile < end : tile > end; asc ? tile++ : tile--) {
			if (this.map[tile] !== "X") {
				if (Math.floor( (Math.random()*4)+1 ) !== 1) {
					this.map[tile] = "C";
				}
			}
		}
		//clear a path
		const path = [ [0,0],[1,0],[0,1], [12,0],[11,0],[12,1], [0,10],[0,9],[1,10], [12,10],[12,9],[11,10] ];
		return (() => {
			const result = [];
			for (var [x,y] of Array.from(path)) {
				result.push(this.setItemAt(x,y,"0"));
			}
			return result;
		})();
	}

	addDrop(x,y) {
		switch (Math.floor( (Math.random()*5)+1 )) {
			case 1:
				var drop = new Drop(x, y, "bomb");
				return this.drops.push(drop);
			case 2:
				drop = new Drop(x,y, "flame");
				return this.drops.push(drop);
		}
	}

	flameOn(x, y, power) {
		let num;
		let asc, end;
		let asc1, end1;
		let asc2, end2;
		let asc3, end3;
		const coords = [];
		coords.push([x,y]);
		//left
		for (num = 1, end = power, asc = 1 <= end; asc ? num <= end : num >= end; asc ? num++ : num--) {
			var needle;
			if ((needle = this.getItemAt(x-num,y), !["X","undefined", "B"].includes(needle))) {
				coords.push([x-num,y]);
				if (this.getItemAt(x-num,y) === "C") {
					this.setItemAt(x-num,y, "0");
					this.addDrop(x-num,y);
					break;
				}
			} else { break; }
		}
		//right
		for (num = 1, end1 = power, asc1 = 1 <= end1; asc1 ? num <= end1 : num >= end1; asc1 ? num++ : num--) {
			var needle1;
			if ((needle1 = this.getItemAt(x+num,y), !["X","undefined", "B"].includes(needle1))) {
				coords.push([x+num,y]);
				if  (this.getItemAt(x+num,y) === "C") {
					this.setItemAt(x+num,y, "0");
					this.addDrop(x+num, y);
					break;
				}
			} else { break; }
		}
		//up
		for (num = 1, end2 = power, asc2 = 1 <= end2; asc2 ? num <= end2 : num >= end2; asc2 ? num++ : num--) {
			var needle2;
			if ((needle2 = this.getItemAt(x,y-num), !["X","undefined", "B"].includes(needle2))) {
				coords.push([x,y-num]);
				if (this.getItemAt(x,y-num) === "C") {
					this.setItemAt(x,y-num, "0");
					this.addDrop(x,y-num);
					break;
				}
			} else { break; }
		}
		//down
		for (num = 1, end3 = power, asc3 = 1 <= end3; asc3 ? num <= end3 : num >= end3; asc3 ? num++ : num--) {
			var needle3;
			if ((needle3 = this.getItemAt(x,y+num), !["X","undefined", "B"].includes(needle3))) {
				coords.push([x,y+num]);
				if (this.getItemAt(x,y+num) === "C") {
					this.setItemAt(x,y+num, "0");
					this.addDrop(x,y+num);
					break;
				}
			} else { break; }
		}
		for (var [ex,why] of Array.from(coords)) {
			for (var bro of Array.from(this.bros)) {
				if (bro != null) {
					[x,y] = Array.from(bro.gps());
					if ((ex === x) && (why === y)) {
						this.killBro(bro.playerNum);
					}
				}
			}
		}
		this.flames[`${x}-${y}`] = coords;
		return `${x}-${y}`;
	}

	flameOff(flame) {
		return delete this.flames[flame];
	}

	getItemAt(x,y) {
		return this.map[(y*13)+x];
	}

	setItemAt(x, y,item) {
		return this.map[(y*13)+x] = item;
	}
}

/*
	legend:
	P = player
	D = drop
	X = block
	0 = path
	B = bomb
	C = crate
*/

module.exports = Game;
