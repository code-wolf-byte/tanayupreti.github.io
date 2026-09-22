// Turns config.json and content/ into real shell scripts baked into the Alpine
// VM image, so the portfolio content (banner/about/projects/whoami) that used
// to live in the fake HTML terminal now runs as genuine commands in the real
// shell.
//
// config.json holds base config — identity and infrastructure. Everything a
// human would want to rewrite lives in content/ as Markdown, parsed with the
// same src/blog parser the browser uses, so the two can never drift.
//
// The Markdown source, not a rendered form, is what lands in the .txt files:
// Markdown is designed to read as plain text, so `cat about.txt` looks right
// without a second renderer to maintain.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePost } from '../../src/blog/post.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config.json'), 'utf8'));
const contentDir = path.join(__dirname, '../../content');
const overlayDir = path.join(__dirname, 'rootfs-overlay');

fs.rmSync(overlayDir, { recursive: true, force: true });

const readPost = (rel) => {
  try {
    return parsePost(fs.readFileSync(path.join(contentDir, rel), 'utf8'));
  } catch (err) {
    // Name the file. The parser reports a line number, and without the path
    // that number is useless once there is more than one content file.
    throw new Error(`content/${rel}: ${err.message}`);
  }
};

// Heredocs carry author-written prose now, and a project writeup could easily
// contain a line reading EOF inside a code block, which would end the heredoc
// early and truncate the command. This delimiter cannot show up by accident.
const EOM = '__PORTFOLIO_EOF__';

/** For the one place content lands in a double-quoted bash string. */
const bashEscape = (str) => str.replace(/([\\$`"])/g, '\\$1');

function writeExecutable(relPath, content) {
  const full = path.join(overlayDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, { mode: 0o755 });
}

function writeText(relPath, content) {
  const full = path.join(overlayDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, { mode: 0o644 });
}

// banner
const bannerArt = config.ascii.join('\n');
// Derived, not hardcoded: edit the art in config.json and the cutoff follows.
const bannerCols = Math.max(...config.ascii.map((line) => [...line].length));
// Shell snippet leaving the terminal width in $cols. stty is the truth;
// $COLUMNS is the fallback for a non-tty, and 80 when neither answers.
const readCols = `cols=$(stty size 2>/dev/null | awk '{print $2}')
case "$cols" in *[!0-9]*|'') cols="\${COLUMNS:-80}";; esac
case "$cols" in *[!0-9]*|''|0) cols=80;; esac`;

// A terminal narrower than the art wraps it into nonsense, so drop to a compact
// title when it won't fit. On a miss $cols is 80, below the art's width, which
// errs toward the version that can't break.
writeExecutable(
  'usr/local/bin/banner',
  `#!/bin/bash
${readCols}

if [ "$cols" -lt ${bannerCols} ]; then
# Short, independent lines only: xterm reflows this buffer when the terminal is
# shown after booting hidden (mobile), and multi-line art drifts. One idea per
# line survives that.
cat <<'EOF'

TANAY UPRETI
portfolio · ${config.hostname}
Type 'help' to get started.
EOF
else
cat <<'EOF'
${bannerArt}

Welcome to ${config.hostname}
Type 'help' for a list of available commands.
Type 'repo' to view the GitHub repository.
EOF
fi
`
);

// about
const aboutText = readPost('about.md').markdown.trim();
writeExecutable(
  'usr/local/bin/about',
  `#!/bin/bash
${readCols}

# Long prose otherwise breaks mid-word wherever the terminal edge lands.
fold -s -w "$cols" <<'${EOM}'

${aboutText}

  Email      ${config.social.email}
  Github     github.com/${config.social.github}
  Linkedin   linkedin.com/in/${config.social.linkedin}
${EOM}
`
);

// projects — one file per project under content/projects, filename order.
// Adding a project is adding a file; nothing else has to be told about it.
const projects = fs
  .readdirSync(path.join(contentDir, 'projects'))
  .filter((name) => name.endsWith('.md'))
  .sort()
  .map((file) => {
    const { meta, markdown } = readPost(`projects/${file}`);
    const project = meta.project;
    if (!project) throw new Error(`content/projects/${file}: missing a [project] table`);
    for (const field of ['name', 'tagline', 'link', 'status', 'year', 'stack']) {
      if (project[field] === undefined) {
        throw new Error(`content/projects/${file}: [project] is missing "${field}"`);
      }
    }
    return { ...project, body: markdown.trim() };
  });

const projectLines = projects
  .map((p) => `  ${p.name.padEnd(16)} ${p.tagline}\n    ${p.stack.join(', ')}\n    ${p.link}`)
  .join('\n\n');
writeExecutable(
  'usr/local/bin/projects',
  `#!/bin/bash
cat <<'${EOM}'

${projectLines}

${projects.length} project(s)
${EOM}
`
);

// repo
writeExecutable(
  'usr/local/bin/repo',
  `#!/bin/bash
echo "${config.repoLink}"
`
);

// whoami — overrides busybox's whoami with the site's existing easter egg.
// The answers are the list items in content/whoami.md; the prose above them
// there is a note to whoever edits it, and is not part of the output.
const whoamiLines = readPost('whoami.md')
  .markdown.split('\n')
  .filter((line) => line.startsWith('- '))
  .map((line) => line.slice(2).trim());

if (whoamiLines.length === 0) throw new Error('content/whoami.md: no "- " list items');

writeExecutable(
  'usr/local/bin/whoami',
  `#!/bin/bash
${readCols}

LINES=(
${whoamiLines.map((l) => `  "${bashEscape(l)}"`).join('\n')}
)
echo
echo "\${LINES[RANDOM % \${#LINES[@]}]}" | fold -s -w "$cols"
`
);

// help
writeExecutable(
  'usr/local/bin/help',
  `#!/bin/bash
cat <<'EOF'

  about       Who made this website?
  projects    Maybe there's something interesting.
  whoami      A perplexing question.
  repo        View the GitHub repository.
  banner      Display the banner.

This is a real Alpine Linux shell running via CheerpX/WebAssembly —
standard commands (ls, cat, vi, ...) work too.
EOF
`
);

// The portfolio as real files in the home directory. The shell lands here and
// so does the file browser, so this is what a visitor sees first; the same
// content/ files drive both these and the commands above.
const HOME = 'home/user';

writeText(
  `${HOME}/README.txt`,
  `${config.title}

You're in a real Alpine Linux VM running in your browser via CheerpX.
Nothing here is faked — poke around.

  about.txt        Who I am
  contact.txt      How to reach me
  projects/        What I've built
  scratch/         Yours — the only writable spot in here

These files are read-only, so open scratch/notes.txt if you want to type
something. Nothing you change leaves your browser.

Standard commands work too (ls, cat, vi, ...). Try 'help' in the terminal.
`
);

writeText(`${HOME}/about.txt`, `${aboutText}\n`);

writeText(
  `${HOME}/contact.txt`,
  `Email      ${config.social.email}
Github     github.com/${config.social.github}
Linkedin   linkedin.com/in/${config.social.linkedin}
Repo       ${config.repoLink}
`
);

// The one writable spot. Everything else under /home/user is locked read-only
// by the Dockerfile; scratch/ is the carve-out, so the editor has something to
// actually save.
writeText(
  `${HOME}/scratch/notes.txt`,
  `This file is yours. Edit it, save it, break it.

Everything else here is read-only. Your changes live in this browser only —
they never reach the real site, and a hard refresh wipes them.
`
);

// One file per project, so the file browser has something to browse. The
// writeup rides along as Markdown source, which is what makes these worth
// opening rather than a restatement of the roster.
for (const p of projects) {
  // Project names come from content and become filenames.
  const safeName = p.name.replace(/[^A-Za-z0-9._-]/g, '_');
  writeText(
    `${HOME}/projects/${safeName}.txt`,
    `${p.name}  [${p.status}, ${p.year}]\n\n${p.tagline}\n\n${p.stack.join(', ')}\n\n${p.link}\n` +
      (p.body ? `\n${p.body}\n` : '')
  );
}

console.log('Generated portfolio content into', overlayDir);
