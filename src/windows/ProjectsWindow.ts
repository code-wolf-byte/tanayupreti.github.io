import { parsePost } from '../blog/post';
import { renderMarkdown } from '../blog/markdown';
import type { WindowContent } from '../types';

type Status = 'active' | 'shipped' | 'archived';

interface Project {
  name: string;
  tagline: string;
  link: string;
  status: string;
  year: string;
  stack: string[];
  /** The writeup, already rendered. Empty when the file has no body. */
  writeup: string;
}

/**
 * One module per file in content/projects, the same files the VM image is
 * built from. Vite splits each into its own chunk and fetches it on demand,
 * so the roster costs one small request per project rather than shipping
 * every writeup in the main bundle.
 */
const sources = import.meta.glob('../../content/projects/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/**
 * SDN — the dispatch console, scoped to one job: showcasing a project.
 *
 * Roster rail on the left, one unit per project; showcase viewport on the
 * right; status strip along the bottom. Selecting a unit is the only
 * interaction, which is the point — the console shows what's relevant to the
 * current choice and nothing else.
 */
export class ProjectsWindow implements WindowContent {
  private container!: HTMLElement;
  private rosterEl!: HTMLElement;
  private detailEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private projects: Project[] = [];
  private selected = 0;
  private destroyed = false;

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = `
      <div class="sdn">
        <div class="sdn-body">
          <div class="sdn-pane sdn-pane-roster">
            <div class="sdn-pane-head">Roster</div>
            <div class="sdn-roster" role="listbox" aria-label="Project roster"></div>
          </div>
          <div class="sdn-pane sdn-pane-detail">
            <div class="sdn-pane-head">Unit detail</div>
            <div class="sdn-detail" aria-live="polite"></div>
          </div>
        </div>
        <div class="sdn-status"></div>
      </div>
    `;
    this.rosterEl = container.querySelector('.sdn-roster')!;
    this.detailEl = container.querySelector('.sdn-detail')!;
    this.statusEl = container.querySelector('.sdn-status')!;
    this.statusEl.textContent = 'LOADING…';

    void this.load();
  }

  destroy(): void {
    this.destroyed = true;
    this.container.innerHTML = '';
  }

  private async load(): Promise<void> {
    const paths = Object.keys(sources).sort();

    try {
      const files = await Promise.all(paths.map((p) => sources[p]()));
      // The window can be closed mid-fetch; writing into a torn-down container
      // would resurrect markup the user already dismissed.
      if (this.destroyed) return;
      this.projects = files.map((text, i) => toProject(text, paths[i]));
    } catch (err) {
      if (this.destroyed) return;
      // A malformed content file otherwise shows as an empty console, which
      // looks like a styling bug rather than the parse error it is.
      this.statusEl.textContent = 'CONTENT ERROR';
      this.detailEl.textContent = (err as Error).message;
      return;
    }

    this.buildRoster();
    this.renderDetail();

    const active = this.projects.filter((p) => p.status === 'active').length;
    this.statusEl.textContent =
      `${this.projects.length} UNIT${this.projects.length === 1 ? '' : 'S'} · ${active} ACTIVE`;
  }

  private buildRoster(): void {
    this.projects.forEach((project, i) => {
      const unit = document.createElement('button');
      unit.className = `sdn-unit sdn-${statusOf(project)}`;
      unit.setAttribute('role', 'option');
      unit.type = 'button';

      // textContent throughout: the content files are author-controlled, but
      // building it this way means a stray `<` in a tagline can never become
      // markup.
      const led = document.createElement('span');
      led.className = 'sdn-led';
      led.setAttribute('aria-hidden', 'true');

      const name = document.createElement('span');
      name.className = 'sdn-unit-name';
      name.textContent = project.name;

      const meta = document.createElement('span');
      meta.className = 'sdn-unit-meta';
      meta.textContent = `${project.year} · ${project.status}`;

      const text = document.createElement('span');
      text.className = 'sdn-unit-text';
      text.append(name, meta);
      unit.append(led, text);

      unit.addEventListener('click', () => this.select(i));
      unit.addEventListener('keydown', (e) => this.onRosterKey(e, i));
      this.rosterEl.appendChild(unit);
    });
    this.markSelected();
  }

  /** Arrow keys walk the roster, the way a console operator would expect. */
  private onRosterKey(e: KeyboardEvent, i: number): void {
    const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + this.projects.length) % this.projects.length;
    this.select(next);
    (this.rosterEl.children[next] as HTMLElement).focus();
  }

  private select(i: number): void {
    if (i === this.selected) return;
    this.selected = i;
    this.markSelected();
    this.renderDetail();
  }

  private markSelected(): void {
    Array.from(this.rosterEl.children).forEach((el, i) => {
      const on = i === this.selected;
      el.classList.toggle('selected', on);
      el.setAttribute('aria-selected', String(on));
      // Roving tabindex: one stop for the whole roster, arrows move within it.
      (el as HTMLElement).tabIndex = on ? 0 : -1;
    });
  }

  private renderDetail(): void {
    const project = this.projects[this.selected];
    this.detailEl.innerHTML = `
      <div class="sdn-detail-head">
        <h2 class="sdn-detail-name"></h2>
        <span class="sdn-badge"></span>
      </div>
      <p class="sdn-detail-tagline"></p>
      <div class="sdn-stats">
        <div class="sdn-stat">
          <span class="sdn-label">Deployed</span><b class="sdn-stat-year"></b>
        </div>
        <div class="sdn-stat">
          <span class="sdn-label">Status</span><b class="sdn-stat-status"></b>
        </div>
        <div class="sdn-stat">
          <span class="sdn-label">Modules</span><b class="sdn-stat-modules"></b>
        </div>
      </div>
      <div class="sdn-section">
        <span class="sdn-label">Stack</span>
        <div class="sdn-chips"></div>
      </div>
      <div class="sdn-section sdn-briefing" hidden>
        <span class="sdn-label">Briefing</span>
        <div class="sdn-writeup"></div>
      </div>
      <a class="sdn-open" target="_blank" rel="noopener noreferrer">▸ Open repository</a>
    `;

    const set = (sel: string, value: string) => {
      (this.detailEl.querySelector(sel) as HTMLElement).textContent = value;
    };
    set('.sdn-detail-name', project.name);
    set('.sdn-badge', project.status.toUpperCase());
    set('.sdn-detail-tagline', project.tagline);
    set('.sdn-stat-year', project.year);
    set('.sdn-stat-status', project.status.toUpperCase());
    set('.sdn-stat-modules', String(project.stack.length).padStart(2, '0'));

    this.detailEl.querySelector('.sdn-badge')!.className =
      `sdn-badge sdn-${statusOf(project)}`;

    const chips = this.detailEl.querySelector('.sdn-chips')!;
    for (const item of project.stack) {
      const chip = document.createElement('span');
      chip.className = 'sdn-chip';
      chip.textContent = item;
      chips.appendChild(chip);
    }

    if (project.writeup) {
      // The one innerHTML with content in it, and it is safe by construction:
      // renderMarkdown escapes every character of the source and emits only
      // its own tags, so there is no path from a content file to live markup.
      (this.detailEl.querySelector('.sdn-writeup') as HTMLElement).innerHTML = project.writeup;
      (this.detailEl.querySelector('.sdn-briefing') as HTMLElement).hidden = false;
    }

    const open = this.detailEl.querySelector('.sdn-open') as HTMLAnchorElement;
    open.href = project.link;
  }
}

/**
 * The same [project] table the image build reads, checked here too: a window
 * that renders a blank card because a field was renamed is far harder to
 * diagnose than one that says which file and which field.
 */
function toProject(source: string, filePath: string): Project {
  const file = filePath.split('/').pop() ?? filePath;
  const { meta, markdown } = parsePost(source);
  const table = meta.project as Record<string, unknown> | undefined;

  if (!table) throw new Error(`${file}: missing a [project] table`);
  const text = (field: string): string => {
    const value = table[field];
    if (typeof value !== 'string') throw new Error(`${file}: [project] needs a "${field}" string`);
    return value;
  };
  if (!Array.isArray(table.stack)) throw new Error(`${file}: [project] needs a "stack" array`);

  return {
    name: text('name'),
    tagline: text('tagline'),
    link: text('link'),
    status: text('status'),
    year: text('year'),
    stack: table.stack.map(String),
    writeup: markdown.trim() ? renderMarkdown(markdown) : '',
  };
}

/** Anything unrecognised parks on `archived` rather than losing its LED. */
function statusOf(project: Project): Status {
  return project.status === 'active' || project.status === 'shipped'
    ? project.status
    : 'archived';
}
