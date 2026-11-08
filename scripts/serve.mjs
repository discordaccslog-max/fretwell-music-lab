// Minimal static server for local testing: node scripts/serve.mjs [port]
// Serves the site under /fretwell-music-lab/ to match the GitHub Pages project path.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/fretwell-music-lab/';
const port = +process.argv[2] || 8123;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(302, { Location: BASE }); res.end(); return; }
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404); res.end('Not found'); return; }
  let p = decodeURIComponent(url.pathname.slice(BASE.length));
  let file = join(ROOT, p);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    const body = await readFile(join(ROOT, '404.html'));
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(body);
  }
}).listen(port, () => console.log(`Serving on http://localhost:${port}${BASE}`));
