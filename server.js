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
  { id: 1,  tag: 'BUILD', title: 'No Builds',        sub: 'Win a fight without placing a single build', duration: 180, active: false, endsAt: null },
  { id: 2,  tag: 'AIM',   title: 'Pistols Only',     sub: 'Eliminations with pistols only', duration: 300, active: false, endsAt: null },
  { id: 3,  tag: 'PACE',  title: 'First to 5 Elims', sub: 'Rush to five eliminations this match', duration: 0, active: false, endsAt: null },
  { id: 4,  tag: 'RISK',  title: 'Hot Drop',         sub: 'Land at the busiest named POI every game', duration: 0, active: false, endsAt: null },
  { id: 5,  tag: 'RISK',  title: 'No Healing',       sub: 'Survive 3 minutes without using any heals', duration: 180, active: false, endsAt: null },
  { id: 6,  tag: 'BUILD', title: 'Drop all Loot',    sub: 'Drop your entire inventory on command', duration: 0, active: false, endsAt: null },
  { id: 7,  tag: 'STYLE', title: 'Default Skin',     sub: 'Play the whole match as the default skin', duration: 0, active: false, endsAt: null },
  { id: 8,  tag: 'PACE',  title: 'Storm Surge',      sub: 'Win the Storm Surge damage check', duration: 300, active: false, endsAt: null },
  { id: 9,  tag: 'LOOT',  title: '30s Drop',         sub: 'Land and fully loot within 30 seconds', duration: 30, active: false, endsAt: null },
  { id: 10, tag: 'AIM',   title: 'Sniper Only',      sub: 'Eliminations with snipers only', duration: 300, active: false, endsAt: null },
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
      challenges = challenges.map(c => {
        if (c.id !== msg.id) return c;
        const active = !c.active;
        return { ...c, active, endsAt: active && c.duration > 0 ? Date.now() + c.duration * 1000 : null };
      });
      broadcast();
    } else if (msg.type === 'addtime') {
      // extend a running timer by msg.seconds (default 60)
      challenges = challenges.map(c =>
        (c.id === msg.id && c.active && c.endsAt)
          ? { ...c, endsAt: c.endsAt + (msg.seconds || 60) * 1000 } : c);
      broadcast();
    } else if (msg.type === 'clear') {
      challenges = challenges.map(c => ({ ...c, active: false, endsAt: null }));
      broadcast();
    }
  });
});

server.listen(PORT, () => {
  // Auto-expire timed challenges and broadcast when one runs out.
  setInterval(() => {
    const now = Date.now();
    if (challenges.some(c => c.active && c.endsAt && c.endsAt <= now)) {
      challenges = challenges.map(c =>
        (c.active && c.endsAt && c.endsAt <= now) ? { ...c, active: false, endsAt: null } : c);
      broadcast();
    }
  }, 1000);

  console.log(`\n  Challenge Deck running`);
  console.log(`  ├─ Control panel : http://localhost:${PORT}/`);
  console.log(`  └─ OBS overlay   : http://localhost:${PORT}/overlay\n`);
});
