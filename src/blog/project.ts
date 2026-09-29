// One project file (content/projects/*.md) as data. DOM-free: the Projects
// window and the static page build (scripts/pages) both read projects here.
import { parsePost } from './post.ts';
import { renderMarkdown } from './markdown.ts';

export interface Project {
  /** The filename without `.md`; the project's URL is /projects/<slug>/. */
  slug: string;
  name: string;
  tagline: string;
  link: string;
  status: string;
  year: string;
  stack: string[];
  /** The writeup, already rendered. Empty when the file has no body. */
  writeup: string;
}

/** Roster order everywhere: newest first, then by name. */
export const byNewest = (a: Project, b: Project): number =>
  b.year.localeCompare(a.year) || a.name.localeCompare(b.name);

/**
 * The same [project] table the image build reads, checked here too: a window
 * that renders a blank card because a field was renamed is far harder to
 * diagnose than one that says which file and which field.
 */
export function toProject(source: string, filePath: string): Project {
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
    slug: file.replace(/\.md$/, ''),
    name: text('name'),
    tagline: text('tagline'),
    link: text('link'),
    status: text('status'),
    year: text('year'),
    stack: table.stack.map(String),
    writeup: markdown.trim() ? renderMarkdown(markdown) : '',
  };
}
