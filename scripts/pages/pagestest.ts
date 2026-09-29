// npm run test:pages — renders every static page against a stub template.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { renderPages } from './pages.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const template = '<head><title>x</title></head><body><div id="desktop"></div></body>';
const pages = renderPages(template, root);

const home = pages.get('index.html')!;
assert.match(home, /<main id="page"><h1>Tanay Upreti<\/h1>/);
assert.match(home, /Arizona State University/, 'about.md body on the home page');
assert.match(home, /<link rel="canonical" href="https:\/\/tanayupreti\.dev\/" \/>/);
assert.match(home, /href="\/projects\/web-server\/"/, 'home links every project');

const project = pages.get('projects/web-server/index.html')!;
assert.ok(project, 'one page per content/projects file');
assert.match(project, /<title>web-server - Tanay Upreti<\/title>/);
assert.match(project, /reverse proxy written in Rust/, 'writeup rendered');
assert.match(project, /<meta name="description" content="A blatant rip-off/);
assert.ok(pages.has('projects/index.html'));
const html = [...pages].filter(([file]) => file.endsWith('.html')).map(([, text]) => text);
assert.equal(html.filter((p) => p.includes('<main id="page">')).length, 5);

// Structured data parses, and no content can close its <script> early.
const ldText = (page: string) => /<script type="application\/ld\+json">(.*?)<\/script>/.exec(page)![1];
const ld = (page: string) => JSON.parse(ldText(page));
assert.equal(ld(home)['@type'], 'Person');
assert.equal(ld(project).codeRepository, 'https://github.com/code-wolf-byte/reverse-proxy-server/');
assert.ok(html.every((p) => !ldText(p).includes('<')), 'raw < inside JSON-LD');

const sitemap = pages.get('sitemap.xml')!;
assert.equal(sitemap.match(/<loc>/g)!.length, 5, 'sitemap lists every page');
assert.match(sitemap, /<loc>https:\/\/tanayupreti\.dev\/projects\/web-server\/<\/loc>/);
assert.match(pages.get('robots.txt')!, /^Sitemap: https:\/\/tanayupreti\.dev\/sitemap\.xml$/m);

console.log(`pages: ALL PASS (${pages.size} pages)`);
