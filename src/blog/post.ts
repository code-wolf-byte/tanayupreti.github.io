/**
 * The blog post file format: a TOML metadata half, then a Markdown half.
 *
 *   [post]
 *   title = "Building a Linux VM in the browser"
 *   date = 2026-09-22
 *
 *   [meta]
 *   tags = ["webvm", "cheerpx"]
 *   draft = false
 *
 *   [content]
 *   # Building a Linux VM
 *
 *   The body starts here, plain **markdown**.
 *
 * `[content]` is the seam: everything above it is TOML, everything below is
 * raw Markdown and is never parsed as TOML. Splitting first is what lets a
 * post contain a line that looks like a table header without confusing
 * anything.
 *
 * Errors carry the line number. A post that fails to parse should say why —
 * that message is the whole authoring feedback loop.
 */

export type TomlValue = string | number | boolean | TomlValue[];
export interface TomlTable {
  [key: string]: TomlValue | TomlTable;
}

export interface Post {
  /** Tables as written: `meta.post.title`, `meta.meta.tags`. */
  meta: TomlTable;
  /** The Markdown half, verbatim. Render it with renderMarkdown when needed. */
  markdown: string;
}

export class PostParseError extends Error {
  // Declared rather than a constructor parameter property: node runs this file
  // directly (npm run test:blog) by stripping types, which cannot emit the
  // assignment a parameter property implies.
  readonly line: number;

  constructor(message: string, line: number) {
    super(`line ${line}: ${message}`);
    this.name = 'PostParseError';
    this.line = line;
  }
}

/** Thrown internally when a value runs past the end of its line and may continue. */
class Incomplete extends Error {}

const CONTENT_HEADER = /^\s*\[content\]\s*$/i;

export function parsePost(source: string): Post {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const seam = lines.findIndex((line) => CONTENT_HEADER.test(line));

  if (seam === -1) {
    throw new PostParseError('missing a [content] section — nothing marks where the post body starts', lines.length);
  }

  return {
    meta: parseToml(lines.slice(0, seam)),
    // One blank line after [content] is the natural way to write it, and is
    // separation rather than content; more than that is the author's business.
    markdown: lines.slice(seam + 1).join('\n').replace(/^\n/, ''),
  };
}

/**
 * ponytail: a TOML subset — tables (including dotted), bare and quoted keys,
 * basic and literal strings, integers, floats, booleans, dates as strings, and
 * arrays that may span lines. No inline tables, no arrays of tables, no
 * multi-line strings. Those are a config-file feature set; a post's metadata
 * has never needed them. Anything unsupported raises rather than being
 * silently dropped.
 */
export function parseToml(lines: string[]): TomlTable {
  const root: TomlTable = {};
  let table = root;
  let i = 0;

  while (i < lines.length) {
    const lineNo = i + 1;
    const line = lines[i];
    const trimmed = line.trim();
    i++;

    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const header = /^\[([^\]]*)\]$/.exec(trimmed);
    if (header) {
      table = resolveTable(root, header[1].trim(), lineNo);
      continue;
    }

    const eq = splitKey(trimmed, lineNo);
    let text = eq.rest;
    let parsed;
    for (;;) {
      try {
        parsed = parseValue(text, 0, lineNo);
        break;
      } catch (err) {
        // An array left open at the end of the line continues on the next one.
        if (!(err instanceof Incomplete) || i >= lines.length) {
          if (err instanceof Incomplete) throw new PostParseError('unterminated array', lineNo);
          throw err;
        }
        text += `\n${lines[i]}`;
        i++;
      }
    }

    const tail = skipTrivia(text, parsed.end);
    if (tail < text.length) {
      throw new PostParseError(`unexpected text after value: ${text.slice(tail).trim()}`, lineNo);
    }
    if (Object.prototype.hasOwnProperty.call(table, eq.key)) {
      throw new PostParseError(`duplicate key "${eq.key}"`, lineNo);
    }
    table[eq.key] = parsed.value;
  }

  return root;
}

function resolveTable(root: TomlTable, path: string, lineNo: number): TomlTable {
  if (path === '') throw new PostParseError('empty table header', lineNo);

  let table = root;
  for (const rawPart of path.split('.')) {
    const part = rawPart.trim().replace(/^"(.*)"$/, '$1');
    if (part === '') throw new PostParseError(`empty name in table header [${path}]`, lineNo);

    const existing = table[part];
    if (existing === undefined) {
      const created: TomlTable = {};
      table[part] = created;
      table = created;
    } else if (typeof existing === 'object' && !Array.isArray(existing)) {
      table = existing;
    } else {
      throw new PostParseError(`[${path}] collides with a key of the same name`, lineNo);
    }
  }
  return table;
}

function splitKey(line: string, lineNo: number): { key: string; rest: string } {
  const match = /^("(?:[^"\\]|\\.)*"|[A-Za-z0-9_-]+)\s*=(.*)$/s.exec(line);
  if (!match) throw new PostParseError(`expected "key = value", got: ${line}`, lineNo);
  return { key: match[1].replace(/^"(.*)"$/s, '$1'), rest: match[2] };
}

/** Whitespace, newlines and comments — the gaps between tokens inside an array. */
function skipTrivia(src: string, start: number): number {
  let i = start;
  for (;;) {
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] !== '#') return i;
    while (i < src.length && src[i] !== '\n') i++;
  }
}

interface Parsed {
  value: TomlValue;
  end: number;
}

function parseValue(src: string, start: number, lineNo: number): Parsed {
  const i = skipTrivia(src, start);
  if (i >= src.length) throw new Incomplete();

  const c = src[i];
  if (c === '"') return parseBasicString(src, i, lineNo);
  if (c === "'") return parseLiteralString(src, i, lineNo);
  if (c === '[') return parseArray(src, i, lineNo);

  const word = /^[^\s,\]#]+/.exec(src.slice(i))![0];
  if (word === 'true') return { value: true, end: i + 4 };
  if (word === 'false') return { value: false, end: i + 5 };

  // Dates and times stay strings: an ISO date sorts correctly as text and
  // formats however the caller likes, where a Date would silently shift a post
  // across a day boundary depending on the reader's timezone.
  if (/^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-][\d:]+)?)?$/.test(word)) {
    return { value: word, end: i + word.length };
  }

  if (/^[+-]?\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?$/.test(word)) {
    return { value: Number(word.replace(/_/g, '')), end: i + word.length };
  }

  throw new PostParseError(`cannot read value: ${word || src.slice(i).trim()}`, lineNo);
}

const STRING_ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  '"': '"',
  '\\': '\\',
  '/': '/',
};

function parseBasicString(src: string, start: number, lineNo: number): Parsed {
  let out = '';
  let i = start + 1;

  while (i < src.length) {
    const c = src[i];
    // A basic string cannot span lines, so a newline is a missing quote rather
    // than a value that might continue below.
    if (c === '\n') break;
    if (c === '"') return { value: out, end: i + 1 };

    if (c === '\\') {
      const esc = src[i + 1];
      if (esc === 'u' || esc === 'U') {
        const width = esc === 'u' ? 4 : 8;
        const hex = src.slice(i + 2, i + 2 + width);
        if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(hex)) {
          throw new PostParseError(`bad unicode escape \\${esc}${hex}`, lineNo);
        }
        out += String.fromCodePoint(parseInt(hex, 16));
        i += 2 + width;
        continue;
      }
      if (!(esc in STRING_ESCAPES)) throw new PostParseError(`unknown escape \\${esc}`, lineNo);
      out += STRING_ESCAPES[esc];
      i += 2;
      continue;
    }

    out += c;
    i++;
  }

  throw new PostParseError('unterminated string', lineNo);
}

function parseLiteralString(src: string, start: number, lineNo: number): Parsed {
  const end = src.indexOf("'", start + 1);
  const newline = src.indexOf('\n', start + 1);
  if (end === -1 || (newline !== -1 && newline < end)) {
    throw new PostParseError('unterminated string', lineNo);
  }
  return { value: src.slice(start + 1, end), end: end + 1 };
}

function parseArray(src: string, start: number, lineNo: number): Parsed {
  const values: TomlValue[] = [];
  let i = start + 1;

  for (;;) {
    i = skipTrivia(src, i);
    // Out of text with the bracket still open: the caller may have more lines.
    if (i >= src.length) throw new Incomplete();
    if (src[i] === ']') return { value: values, end: i + 1 };

    const element = parseValue(src, i, lineNo);
    values.push(element.value);

    i = skipTrivia(src, element.end);
    if (i >= src.length) throw new Incomplete();
    if (src[i] === ',') {
      i++;
      continue;
    }
    if (src[i] !== ']') throw new PostParseError(`expected "," or "]" in array`, lineNo);
  }
}
