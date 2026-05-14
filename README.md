# Real-Time Chat App

A minimal multi-room chat server built with **Node.js**, **Express**, and **Socket.IO**. Users pick a username, join a named room, and exchange messages in real time with typing indicators and a live user list.

## Features

- Multi-room chat — messages are broadcast only inside the joined room
- Live user list per room (joins and disconnects update it)
- "User is typing…" indicator
- System messages on join / leave
- Dockerized for one-command local runs

## Tech Stack

- **Backend:** Node.js, Express 5, Socket.IO 4
- **Frontend:** Vanilla HTML / CSS / JS (no framework, no build step)
- **Container:** Docker + docker-compose
- **Module system:** ES modules

## Project Layout

```
.
├── Backend/
│   ├── app.js          # Express + Socket.IO server, room state, event handlers
│   └── package.json
├── public/
│   ├── index.html      # Single-page UI
│   ├── script.js       # Socket.IO client, DOM wiring
│   └── style.css
├── docs/
│   └── flow.plantuml   # Sequence diagram of join / message / disconnect
├── Dockerfile
└── docker-compose.yml
```

## Running Locally

### With Docker (recommended)

```bash
docker compose up --build
```

Then open <http://localhost:3000>.

### Without Docker

```bash
cd Backend
npm install
npm run dev
```

The server listens on `PORT` (default `3000`) and serves `public/` as static assets, so the frontend and Socket.IO live on the same origin.

## How It Works

1. Client loads `index.html`, which loads `script.js` and the Socket.IO client.
2. User enters a username + room and clicks **Join Room** → client emits `joinRoom`.
3. Server adds the socket to a Socket.IO room and tracks the username in an in-memory `rooms` map.
4. Server broadcasts the updated user list (`roomUsers`) and a system message to the room.
5. `chatMessage`, `typing`, and `disconnect` events update room state and re-broadcast.

See `docs/flow.plantuml` for a sequence diagram.

## Known Limitations

These are deliberate scope cuts for a demo, not bugs. Calling them out so anyone reading the repo knows what would need to change before this is production-shaped.

- **No persistence.** Room membership and messages live in a plain JS object (`const rooms = {}`) in the server process. A container restart wipes everything — no message history, no record of past rooms.
- **No authentication.** Usernames are self-claimed in a text field. Anyone can impersonate anyone; there is no session, token, or identity check.
- **Single-instance only.** Because room state is in-process memory, you cannot horizontally scale. Two replicas behind a load balancer would each hold a different view of who is in which room, and messages would not cross between them.
- **No input sanitization beyond `trim()`** on the client. Messages are rendered with `textContent` (so no XSS via the message body), but there is no rate limiting, length cap, or profanity / abuse handling.
- **No tests.**

## Future Work

In rough priority order if this were to evolve past a demo:

1. **Persistence** — store messages and room metadata in Postgres or MongoDB; load recent history on join.
2. **Auth** — sign-in (OAuth or email+password), signed session tokens, server-side identity instead of trusting the client-supplied username.
3. **Horizontal scaling** — wire up the [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/) so multiple Node instances share pub/sub for broadcasts, with Redis (or another shared store) as the source of truth for room membership.
4. **Rate limiting** on the `chatMessage` and `typing` events to mitigate spam / abuse.
5. **Tests** — at minimum integration tests against a real Socket.IO client covering join, message, typing, and disconnect flows.
6. **Observability** — structured logs, a `/healthz` endpoint, basic metrics (connected sockets, messages/sec).
