import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { renderPages } from './scripts/pages/pages';

const X11_DIR = fileURLToPath(new URL('./scripts/x11-test/', import.meta.url));
const X11_HTML = `${X11_DIR}x11test.html`;
const X11_IMAGE = `${X11_DIR}alpine-x11.ext2`;

/**
 * The X11 prototype at /x11, dev server only (`apply: 'serve'`): nothing here
 * reaches a build, and the ~46MB image never enters public/.
 *
 * Headers are set here rather than left to coi-serviceworker, so the page is
 * cross-origin isolated on the very first load. The image needs Range support
 * plus a validator (Last-Modified/ETag) or HttpBytesDevice refuses it.
 */
function x11Prototype(): Plugin {
  return {
    name: 'x11-prototype',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/x11' && url !== '/x11/alpine.ext2') return next();

        if (!fs.existsSync(X11_IMAGE)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end('X11 image not built: run ./scripts/webvm-image/build.sh x11\n');
          return;
        }
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

        if (url === '/x11') {
          server
            .transformIndexHtml('/x11', fs.readFileSync(X11_HTML, 'utf8'))
            .then((html) => {
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            }, next);
          return;
        }

        const stat = fs.statSync(X11_IMAGE);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Last-Modified', stat.mtime.toUTCString());
        res.setHeader('ETag', `"${stat.size}-${stat.mtimeMs}"`);

        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
        if (!range) {
          res.setHeader('Content-Length', stat.size);
          fs.createReadStream(X11_IMAGE).pipe(res);
          return;
        }
        const start = Number(range[1]);
        const end = Math.min(range[2] ? Number(range[2]) : stat.size - 1, stat.size - 1);
        if (start > end) {
          res.statusCode = 416;
          res.setHeader('Content-Range', `bytes */${stat.size}`);
          res.end();
          return;
        }
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', end - start + 1);
        fs.createReadStream(X11_IMAGE, { start, end }).pipe(res);
      });
    },
  };
}

/** One real HTML file per route, plus sitemap.xml and robots.txt (scripts/pages/pages.ts). */
function staticPages(): Plugin {
  let outDir = '';
  return {
    name: 'static-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      for (const [file, html] of renderPages(template, process.cwd())) {
        fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
        fs.writeFileSync(path.join(outDir, file), html);
      }
    },
  };
}

export default defineConfig({
  plugins: [x11Prototype(), staticPages()],
});
