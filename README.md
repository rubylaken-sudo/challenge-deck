# Challenge Deck — realtime OBS overlay

A control panel you click + a transparent overlay your viewers see, kept in
sync in real time over WebSockets. Toggle a challenge on your control page and
it appears in OBS instantly — on the same machine or across the internet.

```
obs-build/
├─ server.js            ← tiny Node + WebSocket server (source of truth)
├─ package.json
└─ public/
   ├─ control.html      ← your control panel  →  http://localhost:8080/
   └─ overlay.html      ← OBS browser source   →  http://localhost:8080/overlay
```

## Run it locally (works today)

You need [Node.js 18+](https://nodejs.org). In a terminal:

```bash
cd obs-build
npm install
npm start
```

You'll see:

```
Challenge Deck running
├─ Control panel : http://localhost:8080/
└─ OBS overlay   : http://localhost:8080/overlay
```

- Open **http://localhost:8080/** in your browser → that's your control panel.
- In OBS: **Sources → + → Browser**, set the URL to **http://localhost:8080/overlay**,
  width `1920`, height `1080`. Leave "transparent" on (default).

Click a challenge on the control page → it pops into the OBS overlay live.
Open the overlay URL in a normal browser tab too if you want to see it while testing.

## Use it across the internet (so OBS on any PC syncs)

Deploy the folder to any host that runs Node and allows WebSockets — e.g.
**Render**, **Railway**, **Fly.io**, **Glitch**, or your own VPS. The server
already listens on `process.env.PORT`, so most hosts work with zero changes.

Example (Render): new **Web Service**, build `npm install`, start `npm start`.
You'll get a URL like `https://your-app.onrender.com`. Then:
- Control panel: `https://your-app.onrender.com/`
- OBS overlay:   `https://your-app.onrender.com/overlay`

WebSockets upgrade to `wss://` automatically over HTTPS — no code changes.

## Customise the overlay

Add query params to the **overlay** URL in OBS:

| Param    | Values                                              | Example                |
|----------|-----------------------------------------------------|------------------------|
| `corner` | `top-left` `top-right` `bottom-left` `bottom-right` | `?corner=top-right`    |
| `accent` | any CSS color (url-encode `#` as `%23`)             | `?accent=%23ff3b6b`    |
| `tags`   | `1` show category tags · `0` hide                   | `?tags=0`              |

Combine them: `…/overlay?corner=bottom-left&accent=%23ff3b6b&tags=0`

## Edit your challenges

Open `server.js` and edit the `challenges` array near the top — titles,
descriptions, and category tags all live there. Restart the server to apply.

## Notes & next steps

- State lives in memory: restarting the server clears all active challenges.
  For persistence across restarts, write `challenges` to a file or a small DB.
- No authentication: anyone who can reach the control URL can toggle challenges.
  If you deploy publicly, put the control page behind a password / basic auth,
  or only share the `/overlay` URL.
- Want viewer voting, countdown timers, or point values? Those extend the same
  message protocol in `server.js` — happy to spec them out.
