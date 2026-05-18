# Real-Time Chat App
#### Video Demo: https://youtu.be/biDBVb_F3vw
#### Description:

This is a small multi-room chat app I built as my CS50x final project. You pick a username, join a room by name, and start talking to whoever else is in that room. There's a live list of who's online in the room, a "user is typing…" indicator, and system messages when people join or leave so the room doesn't feel empty when you walk in. The whole thing runs in Docker, so getting it up on a fresh machine is one command.

I picked this project because CS50's web track in Weeks 8 and 9 ends at the Flask request/response model, and I kept wondering what came next. Chat is sort of the obvious answer - it's the thing you can't really build cleanly on plain HTTP, because you need the server to push messages without the client asking first. So I went and learned Socket.IO, which is the WebSocket library most Node projects reach for, and built this on top of it.

## What it does

- Multi-room chat - your messages only go to people in your room, not everyone connected to the server
- A live user list that updates whenever someone joins or leaves
- A typing indicator
- System messages on join and leave
- Runs in Docker with one command

## What it's built with

- **Backend:** Node.js, Express 5, Socket.IO 4
- **Frontend:** plain HTML, CSS, and JavaScript - no React, no build step
- **Container:** Docker + docker-compose

## Running it

The easy way, with Docker:

```bash
docker compose up --build
```

Then open _http://localhost:3000_

Without Docker:

```bash
cd Backend
npm install
npm run dev
```

It listens on port 3000 by default. The frontend and Socket.IO live on the same origin, so I never had to deal with CORS.

## How a message actually moves

When you load the page, the client pulls in `script.js` and the Socket.IO client library. You type a username and a room name and hit Join Room, and the client emits a `joinRoom` event. The server adds your socket to that Socket.IO room and stores your username in a plain JS object called `rooms`, keyed by room name. Then it broadcasts an updated user list and a "X has joined" message to everyone in the room. After that, `chatMessage`, `typing`, and `disconnect` events all do the same kind of thing: update the room state on the server, then broadcast the change back out. The PlantUML sequence diagram in `docs/` shows the full flow if you'd rather see it visually.

Most of the server logic lives in `Backend/app.js`. The frontend is just `public/index.html`, `public/script.js`, and `public/style.css`. The client renders messages with `textContent` rather than `innerHTML`, on purpose - more on that below.

## Things I had to decide

**Socket.IO vs. raw WebSockets.** Going with raw `ws` would have been more "from scratch," but Socket.IO gives you rooms, automatic reconnection, and transport fallbacks for free. Rebuilding those wouldn't have taught me anything I wanted to learn, so I went with Socket.IO.

**No database.** I thought about adding Postgres for message history, but the point of the project was learning real-time stuff, not bolting on a database I already knew. So I kept the room state in memory. The trade-off is in "Known Limitations" below - I want it to be clear that it's a deliberate choice, not something I forgot.

**No frontend framework.** It's two screens. Plain JS reads top to bottom and that's what I wanted.

**`textContent`, not `innerHTML`.** The one piece of security I really cared about. Even though there's no auth, a user shouldn't be able to drop a `<script>` tag into another user's browser. Using `textContent` makes that impossible at the rendering layer.

**Docker from day one.** I didn't want anyone - including future me - to have to fight with Node versions just to run the thing.

## What it doesn't do

These are things I left out on purpose, and calling them out so it's clear they aren't bugs:

- **No persistence.** Restart the container and everything is gone. No message history, no record of past rooms.
- **No auth.** Usernames are whatever you type in the box. You can absolutely pretend to be someone else.
- **Single instance only.** Because room state is in memory, you can't run two copies of the server behind a load balancer - they'd disagree about who's in which room.
- **Barely any input handling.** Messages get `.trim()` on the client and that's it. No length cap, no rate limiting.
- **No tests.** I know.

## If I kept working on it

Roughly in the order I'd actually do them: persistence first (Postgres or Mongo, plus loading recent history on join), then real auth with signed session tokens instead of trusting the form field, then horizontal scaling with the Socket.IO Redis adapter so multiple Node instances can share broadcasts. After that, rate limiting on `chatMessage` and `typing`, integration tests covering the four main events, and finally some basic observability - structured logs, a `/healthz` endpoint, and counters for connected sockets and messages per second.
