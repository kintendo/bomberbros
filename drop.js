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
