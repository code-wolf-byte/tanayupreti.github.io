// One blog post (content/blog/*.md) as data. DOM-free: the Blog window and
// the static page build (scripts/pages) both read posts here.
import { parsePost } from './post.ts';
import { renderMarkdown, summarize } from './markdown.ts';

export interface Article {
  /** The filename without `.md`; the post's URL is /blog/<slug>/. */
  slug: string;
  title: string;
  /** YYYY-MM-DD, as written in [post]. */
  date: string;
  tags: string[];
  /** Kept off the built site; the dev server shows it with a badge. */
  draft: boolean;
  /** First paragraph as plain text, for the list and the meta description. */
  summary: string;
  minutes: number;
  html: string;
}

export function toArticle(source: string, filePath: string): Article {
  const file = filePath.split('/').pop() ?? filePath;
  const slug = file.replace(/\.md$/, '');
  // The slug is the URL, and the router only matches these characters.
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`${file}: name blog files in lowercase-kebab-case, e.g. my-post.md`);

  const { meta, markdown } = parsePost(source);
  const post = meta.post as Record<string, unknown> | undefined;
  if (!post) throw new Error(`${file}: missing a [post] table`);
  if (typeof post.title !== 'string') throw new Error(`${file}: [post] needs a "title" string`);
  if (typeof post.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
    throw new Error(`${file}: [post] needs a date like 2026-09-29`);
  }
  const extra = (meta.meta ?? {}) as Record<string, unknown>;

  return {
    slug,
    title: post.title,
    date: post.date,
    tags: Array.isArray(extra.tags) ? extra.tags.map(String) : [],
    draft: extra.draft === true,
    summary: summarize(markdown),
    // ponytail: 220 words a minute, the usual reading-time estimate.
    minutes: Math.max(1, Math.round(markdown.split(/\s+/).filter(Boolean).length / 220)),
    html: renderMarkdown(markdown),
  };
}

/** Newest first. */
export const byDate = (a: Article, b: Article): number =>
  b.date.localeCompare(a.date) || a.title.localeCompare(b.title);

/** "September 29, 2026", the same in node and every browser timezone. */
export const formatDate = (date: string): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
