/**
 * Markdown renderer for blog posts.
 *
 * Written here rather than pulled in, which buys one property worth stating:
 * every character of post text is escaped on the way in, and the only tags
 * that come out are the ones this file emits. Raw HTML in a post renders as
 * visible text, so a post can never inject markup or script — unlike the
 * common libraries, which pass HTML through by default and need a sanitiser
 * bolted on.
 *
 * ponytail: a deliberate subset — headings, paragraphs, fenced and inline
 * code, bold/italic/strike, links, images, blockquotes, nested lists and
 * rules. No tables, footnotes, reference links, setext headings or inline
 * HTML. Add cases here as posts need them; swap in `marked` only if this
 * starts growing a tail of edge cases rather than a few named features.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

/** Every character of post text passes through this before reaching the output. */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/**
 * A link is the one place post text becomes a URL the browser will act on, so
 * it is the one place escaping isn't enough: `javascript:` in an href is live
 * code. Allow http/https/mailto and anything without a scheme (relative paths,
 * anchors); reject the rest, and the link renders as plain text instead.
 *
 * Whitespace and control characters come out first because browsers strip them
 * before resolving a URL — `java\nscript:` would otherwise slip past a naive
 * scheme check and then run.
 */
function safeUrl(url: string): string | null {
  const cleaned = url.replace(/[\s\u0000-\u001f\u007f]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
  if (!scheme) return cleaned;
  return /^(?:https?|mailto)$/i.test(scheme[1]) ? cleaned : null;
}

/**
 * Inline markers, applied to already-escaped text. Escaping leaves `*`, `[`
 * and friends untouched, so the markers still match, and anything the author
 * wrote that looked like a tag is already inert by this point.
 */
function renderInline(escaped: string): string {
  // Code spans are verbatim, so they are cut out before the emphasis and link
  // passes run — `*not bold*` inside backticks must stay literal. A run of
  // backticks delimits, so code containing a backtick still works.
  const parts = escaped.split(/(`+[^`]*?`+)/g);

  return parts
    .map((part, index) => {
      // split() with one capture group alternates: even = text, odd = code.
      if (index % 2 === 1) {
        return `<code>${part.replace(/^(`+)([\s\S]*?)\1$/, '$2')}</code>`;
      }
      return emphasis(part);
    })
    .join('');
}

function emphasis(text: string): string {
  return (
    text
      // Images before links: both start with `[` once the `!` is consumed.
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (whole, alt, url, title) => {
        const href = safeUrl(url);
        if (!href) return whole;
        const titleAttr = title ? ` title="${title}"` : '';
        return `<img src="${href}" alt="${alt}"${titleAttr}>`;
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (whole, label, url, title) => {
        const href = safeUrl(url);
        if (!href) return whole;
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${href}"${titleAttr}>${label}</a>`;
      })
      .replace(/~~([\s\S]+?)~~/g, '<del>$1</del>')
      // Bold before italic, or `**x**` loses its outer pair to the italic rule.
      .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__([\s\S]+?)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Underscores only at word boundaries, so snake_case_names survive.
      .replace(/(?<![\w\\])_([^_]+)_(?!\w)/g, '<em>$1</em>')
  );
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
const RULE = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const NUMBER = /^(\s*)\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;

/** Does this line end the paragraph that precedes it? */
function startsBlock(line: string): boolean {
  return (
    line.trim() === '' ||
    HEADING.test(line) ||
    FENCE.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    BULLET.test(line) ||
    NUMBER.test(line)
  );
}

const indentOf = (line: string): number => /^\s*/.exec(line)![0].length;

export function renderMarkdown(source: string): string {
  // NUL is stripped because renderParagraph uses it as a private marker; a post
  // containing one would otherwise sprout a stray line break.
  return renderBlocks(source.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').split('\n'));
}

function renderBlocks(lines: string[]): string {
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const [, marker, lang] = fence;
      const body: string[] = [];
      i++;
      // An unterminated fence runs to the end of the post rather than throwing:
      // a half-written draft should still render something readable.
      while (i < lines.length && !new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`).test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence
      const attr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${attr}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(escapeHtml(heading[2]))}</h${level}>`);
      i++;
      continue;
    }

    // Before the list rules: `- - -` is a rule, not a one-item list.
    if (RULE.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        body.push(QUOTE.exec(lines[i])![1]);
        i++;
      }
      out.push(`<blockquote>${renderBlocks(body)}</blockquote>`);
      continue;
    }

    if (BULLET.test(line) || NUMBER.test(line)) {
      const [html, next] = renderList(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && !startsBlock(lines[i])) {
      paragraph.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderParagraph(paragraph)}</p>`);
  }

  return out.join('\n');
}

/**
 * Soft line breaks collapse to a space, the way Markdown has always worked;
 * two trailing spaces force a `<br>` instead.
 */
function renderParagraph(lines: string[]): string {
  let text = '';
  lines.forEach((line, index) => {
    text += line.trim();
    // The marker replaces the separator rather than preceding it, or the break
    // would be followed by the space that joined the two lines.
    if (index < lines.length - 1) text += / {2,}$/.test(line) ? '\u0000' : ' ';
  });
  return renderInline(escapeHtml(text)).split('\u0000').join('<br>');
}

/**
 * One list, plus whatever is nested inside its items.
 *
 * An item owns its own first line and every following line indented past the
 * marker. That block is rendered recursively, which is what makes nested
 * lists, multi-line items and a fenced code block inside a bullet all work
 * through the same path.
 */
function renderList(lines: string[], start: number): [string, number] {
  const ordered = NUMBER.test(lines[start]) && !BULLET.test(lines[start]);
  const pattern = ordered ? NUMBER : BULLET;
  const baseIndent = indentOf(lines[start]);
  const items: string[] = [];
  let i = start;

  while (i < lines.length) {
    const match = pattern.exec(lines[i]);
    if (!match || indentOf(lines[i]) !== baseIndent) break;

    const body = [match[2]];
    i++;
    // Continuation: anything indented deeper, and blank lines between them.
    while (i < lines.length) {
      if (lines[i].trim() === '') {
        // A blank line only continues the item if indented content follows.
        const next = lines[i + 1];
        if (next === undefined || next.trim() === '' || indentOf(next) <= baseIndent) break;
        body.push('');
        i++;
        continue;
      }
      if (indentOf(lines[i]) <= baseIndent) break;
      body.push(lines[i].slice(baseIndent + 1));
      i++;
    }

    items.push(`<li>${renderItem(body)}</li>`);
  }

  const tag = ordered ? 'ol' : 'ul';
  return [`<${tag}>\n${items.join('\n')}\n</${tag}>`, i];
}

/**
 * A single-line item stays inline, so the common `- a` doesn't gain a stray
 * `<p>`. Anything longer goes through the block renderer.
 */
function renderItem(body: string[]): string {
  if (body.length === 1) return renderInline(escapeHtml(body[0]));

  const [first, ...rest] = body;
  const nested = renderBlocks(rest);
  return `${renderInline(escapeHtml(first))}${nested ? `\n${nested}` : ''}`;
}
