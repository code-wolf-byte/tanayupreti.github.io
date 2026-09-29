import { byDate, formatDate, toArticle, type Article } from '../blog/article';
import type { WindowContent } from '../types';

/**
 * One chunk per post in content/blog, fetched when the window opens. Adding
 * a post is adding a file; the static pages pick it up from the same folder.
 */
const sources = import.meta.glob('../../content/blog/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/**
 * A reader: post list on the left, the article on the right. Built for long
 * text rather than for show, so the article is set in Plex Sans at a reading
 * measure, and the chrome stays out of the way.
 */
export class BlogWindow implements WindowContent {
  private container!: HTMLElement;
  private listEl!: HTMLElement;
  private articleEl!: HTMLElement;
  private posts: Article[] = [];
  private selected = 0;
  private destroyed = false;
  private readonly initial?: string;
  private readonly onSelect?: (slug: string) => void;

  /** `initial`: the slug to show first (from /blog/<slug>/). */
  constructor(initial?: string, onSelect?: (slug: string) => void) {
    this.initial = initial;
    this.onSelect = onSelect;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = `
      <div class="blog">
        <nav class="blog-list" aria-label="Posts"></nav>
        <article class="blog-article" tabindex="-1"><p class="blog-empty">Loading…</p></article>
      </div>
    `;
    this.listEl = container.querySelector('.blog-list')!;
    this.articleEl = container.querySelector('.blog-article')!;
    void this.load();
  }

  destroy(): void {
    this.destroyed = true;
    this.container.innerHTML = '';
  }

  private async load(): Promise<void> {
    const paths = Object.keys(sources);
    try {
      const files = await Promise.all(paths.map((p) => sources[p]()));
      if (this.destroyed) return;
      // Drafts show while writing (dev server) and never on the built site.
      this.posts = files
        .map((text, i) => toArticle(text, paths[i]))
        .filter((post) => import.meta.env.DEV || !post.draft)
        .sort(byDate);
    } catch (err) {
      if (this.destroyed) return;
      // A malformed post should say which file and why, not render blank.
      this.articleEl.innerHTML = '<p class="blog-empty blog-error"></p>';
      this.articleEl.firstElementChild!.textContent = (err as Error).message;
      return;
    }

    if (!this.posts.length) {
      this.articleEl.innerHTML = '<p class="blog-empty">No posts yet.</p>';
      return;
    }
    this.selected = Math.max(0, this.posts.findIndex((p) => p.slug === this.initial));
    this.buildList();
    this.render();
  }

  private buildList(): void {
    this.posts.forEach((post, i) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'blog-item';

      const title = document.createElement('span');
      title.className = 'blog-item-title';
      title.textContent = post.title;
      const meta = document.createElement('span');
      meta.className = 'blog-item-meta';
      meta.textContent = `${formatDate(post.date)}${post.draft ? ' · draft' : ''}`;
      const summary = document.createElement('span');
      summary.className = 'blog-item-summary';
      summary.textContent = post.summary;

      item.append(title, meta, summary);
      item.addEventListener('click', () => this.select(i));
      this.listEl.appendChild(item);
    });
  }

  private select(i: number): void {
    if (i === this.selected) return;
    this.selected = i;
    this.onSelect?.(this.posts[i].slug);
    this.render();
    this.articleEl.scrollTop = 0;
  }

  private render(): void {
    Array.from(this.listEl.children).forEach((el, i) => {
      el.classList.toggle('selected', i === this.selected);
      el.setAttribute('aria-current', String(i === this.selected));
    });

    const post = this.posts[this.selected];
    this.articleEl.innerHTML = `
      <header class="blog-head">
        <div class="blog-meta"><time></time><span class="blog-minutes"></span></div>
        <h1 class="blog-title"></h1>
        <div class="blog-tags"></div>
      </header>
      <div class="blog-prose"></div>
    `;
    const time = this.articleEl.querySelector('time')!;
    time.dateTime = post.date;
    time.textContent = formatDate(post.date);
    this.articleEl.querySelector('.blog-minutes')!.textContent = `${post.minutes} min read`;
    this.articleEl.querySelector('.blog-title')!.textContent = post.title;

    const tags = this.articleEl.querySelector('.blog-tags')!;
    for (const tag of post.draft ? ['draft', ...post.tags] : post.tags) {
      const chip = document.createElement('span');
      chip.className = tag === 'draft' && post.draft ? 'blog-tag is-draft' : 'blog-tag';
      chip.textContent = tag;
      tags.appendChild(chip);
    }

    // Safe by construction: renderMarkdown escapes every character of the
    // source and emits only its own tags (see src/blog/markdown.ts).
    this.articleEl.querySelector('.blog-prose')!.innerHTML = post.html;
    // Links in a post leave the desktop, never replace it.
    for (const a of this.articleEl.querySelectorAll<HTMLAnchorElement>('.blog-prose a')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  }
}
