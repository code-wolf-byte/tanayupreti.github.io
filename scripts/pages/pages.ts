// Static pages for crawlers and no-JS visitors, written next to the built
// index.html by the `static-pages` plugin in vite.config.ts.
//
// Every page is the built index.html (same bundle, same desktop) with its own
// <title>/meta and the content as plain HTML in <main id="page">. The desktop
// still boots on top and opens the matching window (src/desktop/url.ts), and
// index.html hides <main> visually once JS runs; it stays in the DOM for
// search engines and screen readers.
//
// Content comes from content/ through the same parsers as the windows and the
// VM image, so there is still one copy of every word.
import fs from 'node:fs';
import path from 'node:path';
import { parsePost } from '../../src/blog/post.ts';
import { renderMarkdown, escapeHtml } from '../../src/blog/markdown.ts';
import { toProject, type Project } from '../../src/blog/project.ts';

interface Page {
  /** Output path relative to dist/, e.g. `projects/web-server/index.html`. */
  file: string;
  route: string;
  title: string;
  description: string;
  body: string;
  /** schema.org data, so results can show who and what rather than guess. */
  jsonLd: Record<string, unknown>;
}

/** Every file to write under dist/: the pages, plus sitemap.xml and robots.txt. */
export function renderPages(template: string, root: string): Map<string, string> {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
  const origin = `https://${config.hostname}`;
  const name: string = config.title.split(' - ').pop();
  const content = path.join(root, 'content');

  const about = parsePost(fs.readFileSync(path.join(content, 'about.md'), 'utf8')).markdown;
  const projectDir = path.join(content, 'projects');
  const projects = fs
    .readdirSync(projectDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => toProject(fs.readFileSync(path.join(projectDir, f), 'utf8'), f));

  const projectList = `<ul>${projects
    .map((p) => `<li><a href="/projects/${p.slug}/">${escapeHtml(p.name)}</a> — ${escapeHtml(p.tagline)}</li>`)
    .join('')}</ul>`;
  const { email, github, linkedin } = config.social;
  const person = {
    '@type': 'Person',
    name,
    url: `${origin}/`,
    email: `mailto:${email}`,
    sameAs: [`https://github.com/${github}`, `https://www.linkedin.com/in/${linkedin}`],
  };
  const contact = `<ul>
<li><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></li>
<li><a href="https://github.com/${escapeHtml(github)}">GitHub</a></li>
<li><a href="https://www.linkedin.com/in/${escapeHtml(linkedin)}">LinkedIn</a></li>
</ul>`;

  const pages: Page[] = [
    {
      file: 'index.html',
      route: '/',
      title: config.title,
      description: summary(about),
      body: `<h1>${escapeHtml(name)}</h1>${renderMarkdown(about)}<h2>Projects</h2>${projectList}<h2>Contact</h2>${contact}`,
      jsonLd: person,
    },
    {
      file: 'projects/index.html',
      route: '/projects/',
      title: `Projects - ${name}`,
      description: `Projects by ${name}: ${projects.map((p) => p.name).join(', ')}.`,
      body: `<h1>Projects</h1>${projectList}<p><a href="/">${escapeHtml(name)}</a></p>`,
      jsonLd: {
        '@type': 'CollectionPage',
        name: `Projects - ${name}`,
        url: `${origin}/projects/`,
        author: person,
        hasPart: projects.map((p) => ({ '@type': 'SoftwareSourceCode', name: p.name, url: `${origin}/projects/${p.slug}/` })),
      },
    },
    ...projects.map((p) => ({
      file: `projects/${p.slug}/index.html`,
      route: `/projects/${p.slug}/`,
      title: `${p.name} - ${name}`,
      description: p.tagline,
      body: projectBody(p, name),
      jsonLd: {
        '@type': 'SoftwareSourceCode',
        name: p.name,
        description: p.tagline,
        url: `${origin}/projects/${p.slug}/`,
        codeRepository: p.link,
        programmingLanguage: p.stack,
        dateCreated: p.year,
        author: person,
      },
    })),
  ];

  const files = new Map(pages.map((page) => [page.file, fill(template, page, origin)]));
  files.set(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${escapeHtml(origin + page.route)}</loc></url>`).join('\n')}
</urlset>
`,
  );
  files.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  return files;
}

function projectBody(p: Project, name: string): string {
  return `<h1>${escapeHtml(p.name)}</h1>
<p>${escapeHtml(p.tagline)}</p>
<dl><dt>Year</dt><dd>${escapeHtml(p.year)}</dd><dt>Status</dt><dd>${escapeHtml(p.status)}</dd><dt>Stack</dt><dd>${p.stack.map(escapeHtml).join(', ')}</dd></dl>
${p.writeup}
<p><a href="${escapeHtml(p.link)}">Repository</a> · <a href="/projects/">All projects</a> · <a href="/">${escapeHtml(name)}</a></p>`;
}

function fill(template: string, page: Page, origin: string): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = origin + page.route;
  const head = `<title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${url}" />
  <script type="application/ld+json">${jsonLd(page.jsonLd)}</script>`;

  if (!/<title>.*<\/title>/.test(template) || !template.includes('<div id="desktop">')) {
    throw new Error('index.html changed shape: expected <title> and <div id="desktop">');
  }
  // Function replacements: page text must never be read as `$&`-style patterns.
  return template
    .replace(/<title>.*<\/title>/, () => head)
    .replace('<div id="desktop">', () => `<main id="page">${page.body}</main>\n  <div id="desktop">`);
}

/** `<` escaped so no content string can close the script element early. */
const jsonLd = (data: Record<string, unknown>): string =>
  JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');

/** First paragraph as plain text, cut to what a results page shows. */
function summary(markdown: string): string {
  const text = markdown.trim().split(/\n\s*\n/)[0].replace(/\s+/g, ' ');
  if (text.length <= 155) return text;
  return text.slice(0, 155).replace(/\s+\S*$/, '') + '…';
}
