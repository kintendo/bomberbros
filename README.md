Bomber Bros
===========

bomberman clone — node/colyseus/canvas

Stack
-----
* node.js
* colyseus (game server framework)
* uWebSockets.js (transport)
* canvas


Run locally
-----------
* `npm install`
* `npm start` (listens on `$PORT`, default 2567)
* open `http://localhost:2567`
* `npm test` runs the game-logic + schema-sync tests


Deploy (Render)
---------------
The Colyseus server also serves the client, so it deploys as a single
persistent web service (Render supports WebSockets on all plans):

* push this repo to GitHub
* Render Dashboard -> New -> Blueprint -> select the repo (uses `render.yaml`)
* or create a Web Service manually: build `npm install`, start `npm start`

Render injects `PORT` and terminates TLS, so the client connects over
`wss://` automatically. Note: this needs a persistent host — it will not
run on serverless platforms (Vercel/Netlify/Lambda), which don't keep
WebSocket servers alive.


Game Features
-------------
* concurrent games
* 4 player real-time


Art Credit
----------
[box crate](http://flashvideotrainingsource.com/featured_post/hints-and-tips/box2d-for-flash-and-as3-bitmaps-and-boxes)  
[companion cube](http://browse.deviantart.com/art/The-Companion-Cube-74637206)  
[zelda flame](http://www.videogamesprites.net/Zelda1/Objects/)  
[player, bomb, drops](http://browse.deviantart.com/art/Bomberman-Sprites-Custom-291382338)  
