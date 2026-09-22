// Checks src/blog against the post format. Pure string work, no browser and no
// build step: run it with `npm run test:blog`.
import assert from 'node:assert/strict';
import { parsePost, parseToml, PostParseError } from '../../src/blog/post.ts';
import { renderMarkdown } from '../../src/blog/markdown.ts';

let failures = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL  ${name}\n      ${(err as Error).message.replace(/\n/g, '\n      ')}`);
  }
}

const SAMPLE = `[post]
title = "Building a Linux VM in the browser"
date = 2026-09-22

[meta]
tags = ["webvm", "cheerpx"]
draft = false

[content]
# Building a Linux VM

The body starts here, plain **markdown**.
`;

// ---- the two-section split -------------------------------------------------

test('splits metadata from content', () => {
  const post = parsePost(SAMPLE);
  assert.equal((post.meta.post as Record<string, unknown>).title, 'Building a Linux VM in the browser');
  assert.ok(post.markdown.startsWith('# Building a Linux VM'));
  assert.ok(!post.markdown.includes('[post]'));
});

test('date stays an ISO string, not a timezone-shifted Date', () => {
  const post = parsePost(SAMPLE);
  assert.equal((post.meta.post as Record<string, unknown>).date, '2026-09-22');
});

test('reads arrays and booleans', () => {
  const meta = parsePost(SAMPLE).meta.meta as Record<string, unknown>;
  assert.deepEqual(meta.tags, ['webvm', 'cheerpx']);
  assert.equal(meta.draft, false);
});

test('a table header in the body is left alone', () => {
  const post = parsePost(`[post]\ntitle = "x"\n\n[content]\nSee [meta] below.\n\n[meta]\nnot parsed.\n`);
  assert.ok(post.markdown.includes('[meta]'));
  assert.equal(post.meta.meta, undefined);
});

test('missing [content] names the problem', () => {
  assert.throws(() => parsePost('[post]\ntitle = "x"\n'), (err: Error) => {
    assert.ok(err instanceof PostParseError);
    assert.match(err.message, /\[content\]/);
    return true;
  });
});

// ---- the metadata half -----------------------------------------------------

test('comments are skipped, but not inside strings', () => {
  const meta = parseToml(['# a comment', 'title = "sharp # sign"', 'n = 1 # trailing']) as Record<string, unknown>;
  assert.equal(meta.title, 'sharp # sign');
  assert.equal(meta.n, 1);
});

test('arrays may span lines', () => {
  const meta = parseToml(['tags = [', '  "a",', '  "b",   # trailing comma and comment', ']']) as Record<string, unknown>;
  assert.deepEqual(meta.tags, ['a', 'b']);
});

test('numbers, floats and underscores', () => {
  const meta = parseToml(['i = 42', 'f = 1.5', 'big = 1_000', 'neg = -3']) as Record<string, unknown>;
  assert.deepEqual([meta.i, meta.f, meta.big, meta.neg], [42, 1.5, 1000, -3]);
});

test('literal strings keep their backslashes', () => {
  const meta = parseToml(["path = 'C:\\new\\test'"]) as Record<string, unknown>;
  assert.equal(meta.path, 'C:\\new\\test');
});

test('escapes in basic strings', () => {
  const meta = parseToml(['s = "a\\tb\\nc\\"d\\u0041"']) as Record<string, unknown>;
  assert.equal(meta.s, 'a\tb\nc"dA');
});

test('nested arrays', () => {
  const meta = parseToml(['m = [[1, 2], [3]]']) as Record<string, unknown>;
  assert.deepEqual(meta.m, [[1, 2], [3]]);
});

test('dotted table headers nest', () => {
  const meta = parseToml(['[a.b]', 'k = 1']) as Record<string, Record<string, Record<string, unknown>>>;
  assert.equal(meta.a.b.k, 1);
});

test('a duplicate key is an error, not a silent overwrite', () => {
  assert.throws(() => parseToml(['[post]', 'title = "a"', 'title = "b"']), /duplicate key "title"/);
});

test('errors carry the line number', () => {
  assert.throws(() => parseToml(['[post]', 'title = "ok"', 'broken = @@@']), (err: Error) => {
    assert.ok(err instanceof PostParseError);
    assert.equal(err.line, 3);
    return true;
  });
});

test('an unterminated string is an error, not a swallowed line', () => {
  assert.throws(() => parseToml(['title = "oops', 'date = 2026-01-01']), /unterminated string/);
});

test('an unterminated array is an error', () => {
  assert.throws(() => parseToml(['tags = ["a",']), /unterminated array/);
});

// ---- the content half ------------------------------------------------------

test('headings, emphasis and inline code', () => {
  assert.equal(renderMarkdown('## Title'), '<h2>Title</h2>');
  assert.equal(renderMarkdown('a **b** c'), '<p>a <strong>b</strong> c</p>');
  assert.equal(renderMarkdown('a *b* c'), '<p>a <em>b</em> c</p>');
  assert.equal(renderMarkdown('a ~~b~~ c'), '<p>a <del>b</del> c</p>');
  assert.equal(renderMarkdown('use `ls -la`'), '<p>use <code>ls -la</code></p>');
});

test('markers inside inline code stay literal', () => {
  assert.equal(renderMarkdown('`a *b* c`'), '<p><code>a *b* c</code></p>');
});

test('snake_case survives the underscore rule', () => {
  assert.equal(renderMarkdown('call read_file_now here'), '<p>call read_file_now here</p>');
  assert.equal(renderMarkdown('an _emphasised_ word'), '<p>an <em>emphasised</em> word</p>');
});

test('fenced code keeps its language and escapes its body', () => {
  const html = renderMarkdown('```ts\nconst a = 1 < 2;\n```');
  assert.equal(html, '<pre><code class="language-ts">const a = 1 &lt; 2;</code></pre>');
});

test('soft breaks join, two trailing spaces break', () => {
  assert.equal(renderMarkdown('one\ntwo'), '<p>one two</p>');
  assert.equal(renderMarkdown('one  \ntwo'), '<p>one<br>two</p>');
});

test('blockquotes and rules', () => {
  assert.equal(renderMarkdown('> quoted'), '<blockquote><p>quoted</p></blockquote>');
  assert.equal(renderMarkdown('---'), '<hr>');
  // A rule wins over a one-item list.
  assert.equal(renderMarkdown('- - -'), '<hr>');
});

test('lists, including nested ones', () => {
  assert.equal(renderMarkdown('- a\n- b'), '<ul>\n<li>a</li>\n<li>b</li>\n</ul>');
  assert.equal(renderMarkdown('1. a\n2. b'), '<ol>\n<li>a</li>\n<li>b</li>\n</ol>');

  const nested = renderMarkdown('- a\n  - b\n- c');
  assert.ok(nested.includes('<ul>\n<li>b</li>\n</ul>'), nested);
  assert.ok(nested.includes('<li>c</li>'), nested);
});

test('links render, titles included', () => {
  assert.equal(renderMarkdown('[x](https://a.test)'), '<p><a href="https://a.test">x</a></p>');
  assert.equal(renderMarkdown('[x](/rel)'), '<p><a href="/rel">x</a></p>');
  assert.equal(renderMarkdown('![alt](/i.png)'), '<p><img src="/i.png" alt="alt"></p>');
});

// ---- the part that must not be simplified away -----------------------------

test('post text can never become markup', () => {
  assert.equal(renderMarkdown('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(renderMarkdown('<img src=x onerror=alert(1)>'), '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  assert.ok(!renderMarkdown('# <b>hi</b>').includes('<b>'));
});

test('javascript: and data: links do not become hrefs', () => {
  assert.ok(!renderMarkdown('[x](javascript:alert(1))').includes('href'));
  assert.ok(!renderMarkdown('[x](data:text/html;base64,PHN2Zz4=)').includes('href'));
  assert.ok(!renderMarkdown('![x](javascript:alert(1))').includes('src='));
});

test('a scheme split by whitespace does not slip through', () => {
  // Browsers strip the newline before resolving, so the check must too.
  const html = renderMarkdown('[x](java\nscript:alert(1))');
  assert.ok(!/href="java\s*script:/i.test(html), html);
});

test('an entity-encoded scheme stays inert', () => {
  const html = renderMarkdown('[x](java&#115;cript:alert(1))');
  assert.ok(!html.includes('javascript:'), html);
});

test('a quote in a URL cannot break out of the attribute', () => {
  const html = renderMarkdown('[x](/a"onmouseover="alert(1))');
  assert.ok(!/onmouseover="alert/.test(html), html);
});

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
