const { Room, ServerError } = require('colyseus');
const { GameState } = require('../schema/state');

// Timings (ms) for a planted bomb.
const FUSE = 3000;   // bomb -> explosion
const FLAME = 500;   // explosion -> flames clear

class BomberRoom extends Room {
  onCreate(options) {
    this.maxClients = 4;
    const name = (options && options.name) || "game";
    this.setMetadata({ name });
    this.setState(new GameState().init(name));

    // sessionId -> player number for this room
    this.broNums = {};

    this.onMessage("move", (client, data) => {
      const broNum = this.broNums[client.sessionId];
      if (this.state.status === "on" && this.isActive(broNum)) {
        this.state.moveBro(broNum, data && data.direction);
      }
    });

    this.onMessage("plant", (client) => {
      const broNum = this.broNums[client.sessionId];
      if (this.state.status !== "on" || !this.isActive(broNum)) return;
      const bomb = this.state.plantBomb(broNum);
      if (!bomb) return;
      this.clock.setTimeout(() => {
        const flame = this.state.explodeBomb(bomb);
        this.clock.setTimeout(() => this.state.flameOff(flame), FLAME);
      }, FUSE);
    });

    this.onMessage("start", () => {
      this.state.status = "on";
      this.broadcast("start_game");
    });
  }

  onJoin(client, options) {
    const broNum = this.state.addBro();
    if (!broNum) throw new ServerError(4001, "game full");
    this.broNums[client.sessionId] = broNum;
    // a player joining a game already in progress skips the lobby/start step
    if (this.state.status === "on") client.send("start_game");
  }

  onLeave(client) {
    const broNum = this.broNums[client.sessionId];
    delete this.broNums[client.sessionId];
    if (broNum) this.state.leave(broNum);
    // autoDispose tears the room down once the last player leaves
  }

  isActive(broNum) {
    const bro = broNum && this.state.bros[broNum - 1];
    return !!(bro && bro.active);
  }
}

module.exports = { BomberRoom };
