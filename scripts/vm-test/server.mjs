// Minimal COOP/COEP static server with Range support (HttpBytesDevice needs ranges),
// plus a /result sink so the headless page can report back and end the run.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
const IMG = process.argv[3];

// Wrong types are silently fatal: a stylesheet served as octet-stream is dropped.
const TYPES = {
  '.html': 'text/html',
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.ext2': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  const setCoi = () => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  };

  if (req.method === 'POST' && req.url === '/result') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(204); res.end();
      console.log(body);
      server.close();
      process.exit(0);
    });
    return;
  }

  const file = req.url === '/webvm/alpine.ext2' ? IMG : path.join(ROOT, req.url === '/' ? 'spike.html' : req.url);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('nope'); return; }

  const stat = fs.statSync(file);
  setCoi();
  res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  // HttpBytesDevice refuses to init without a cache validator.
  res.setHeader('Last-Modified', stat.mtime.toUTCString());
  res.setHeader('ETag', `"${stat.size}-${stat.mtimeMs}"`);

  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : stat.size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(file).pipe(res);
  }
});

server.listen(8099, () => console.error('serving on 8099'));
