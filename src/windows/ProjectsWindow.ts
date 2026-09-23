import config from '../../config.json';
import type { WindowContent } from '../types';

type Status = 'active' | 'shipped' | 'archived';

interface Project {
  name: string;
  tagline: string;
  link: string;
  status: string;
  year: string;
  stack: string[];
}

const projects: Project[] = config.projects;

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
  private selected = 0;

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

    this.buildRoster();
    this.renderDetail();

    const active = projects.filter((p) => p.status === 'active').length;
    container.querySelector('.sdn-status')!.textContent =
      `${projects.length} UNIT${projects.length === 1 ? '' : 'S'} · ${active} ACTIVE`;
  }

  destroy(): void {
    this.container.innerHTML = '';
  }

  private buildRoster(): void {
    projects.forEach((project, i) => {
      const unit = document.createElement('button');
      unit.className = `sdn-unit sdn-${statusOf(project)}`;
      unit.setAttribute('role', 'option');
      unit.type = 'button';

      // textContent throughout: config.json is author-controlled, but building
      // it this way means a stray `<` in a tagline can never become markup.
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
    const next = (i + delta + projects.length) % projects.length;
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
    const project = projects[this.selected];
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

    const open = this.detailEl.querySelector('.sdn-open') as HTMLAnchorElement;
    open.href = project.link;
  }
}

/** Anything unrecognised parks on `archived` rather than losing its LED. */
function statusOf(project: Project): Status {
  return project.status === 'active' || project.status === 'shipped'
    ? project.status
    : 'archived';
}
