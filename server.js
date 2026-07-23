/**
 * Challenge Deck — realtime sync server
 *
 * One small Node process that:
 *   - serves the control panel  (/)  and the OBS overlay (/overlay)
 *   - holds the single source of truth for which challenges are active
 *   - broadcasts every change to all connected clients over WebSocket
 *
 * Run:   npm install && npm start
 * Then:  open  http://localhost:8080/         (your control panel)
 *        add   http://localhost:8080/overlay  as a Browser Source in OBS
 *
 * Deploy: any host that runs Node and allows WebSockets (Render, Railway,
 *         Fly.io, Glitch, a VPS...). It listens on process.env.PORT.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const PUBLIC = path.join(__dirname, 'public');

// ---- Source of truth -------------------------------------------------------
// Edit this list to change your challenges.
//   active   = live on/off state (managed at runtime)
//   duration = countdown length in SECONDS; 0 = no timer (stays until cleared)
//   endsAt   = timestamp the timer expires (managed at runtime)
let challenges = [
  { id: 1,  tag: 'DROP',  title: 'Choose Next Drop Spot', sub: 'Squad votes and lands at a chosen POI', active: false },
  { id: 2,  tag: 'AIM',   title: 'One Gun Only Challenge', sub: 'Eliminations with a single weapon type', active: false },
  { id: 3,  tag: 'CHAT',  title: "Don't Say Normie", sub: 'Say the word and the challenge is failed', active: false },
  { id: 4,  tag: 'RISK',  title: 'Hot Drop',         sub: 'Land at the busiest named POI every game', active: false },
  { id: 5,  tag: 'STYLE', title: 'Choose My Skin',   sub: 'Chat picks the skin for the next match', active: false },
  { id: 6,  tag: 'BUILD', title: 'Drop all Loot',    sub: 'Drop your entire inventory on command', active: false },
  { id: 7,  tag: 'CHILL', title: 'No Challenges This Match', sub: 'A free match — no challenges allowed', active: false },
  { id: 8,  tag: 'PACE',  title: 'Random Fill Game', sub: 'Queue with random fills for the match', active: false },
  { id: 9,  tag: 'STYLE', title: 'Choose My Sprite', sub: 'Chat picks the sprite for the next match', active: false },
];

// ---- Static file server ----------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/' || url === '') url = '/control.html';
  if (url === '/overlay' || url === '/overlay/') url = '/overlay.html';

  const filePath = path.join(PUBLIC, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---- WebSocket sync --------------------------------------------------------
const wss = new WebSocketServer({ server });

function broadcast() {
  const msg = JSON.stringify({ type: 'state', challenges });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

wss.on('connection', (ws) => {
  // Send current state to whoever just connected (control panel or overlay).
  ws.send(JSON.stringify({ type: 'state', challenges }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'toggle') {
      challenges = challenges.map(c => c.id === msg.id ? { ...c, active: !c.active } : c);
      broadcast();
    } else if (msg.type === 'clear') {
      challenges = challenges.map(c => ({ ...c, active: false }));
      broadcast();
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n  Challenge Deck running`);
  console.log(`  ├─ Control panel : http://localhost:${PORT}/`);
  console.log(`  └─ OBS overlay   : http://localhost:${PORT}/overlay\n`);
});
