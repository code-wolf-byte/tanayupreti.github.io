// Turns config.json into real shell scripts baked into the Alpine VM image,
// so the portfolio content (banner/about/projects/whoami) that used to live
// in the fake HTML terminal now runs as genuine commands in the real shell.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config.json'), 'utf8'));
const overlayDir = path.join(__dirname, 'rootfs-overlay');

fs.rmSync(overlayDir, { recursive: true, force: true });

const stripHtml = (str) =>
  str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

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
writeExecutable(
  'usr/local/bin/banner',
  `#!/bin/bash
cat <<'EOF'
${bannerArt}

Welcome to ${config.hostname}
Type 'help' for a list of available commands.
Type 'repo' to view the GitHub repository.
EOF
`
);

// about
const aboutText = stripHtml(config.aboutGreeting);
writeExecutable(
  'usr/local/bin/about',
  `#!/bin/bash
cat <<'EOF'

${aboutText}

  Email      ${config.social.email}
  Github     github.com/${config.social.github}
  Linkedin   linkedin.com/in/${config.social.linkedin}
EOF
`
);

// projects
const projectLines = config.projects
  .map(([name, desc, link]) => `  ${name.padEnd(16)} ${desc}\n    ${link}`)
  .join('\n\n');
writeExecutable(
  'usr/local/bin/projects',
  `#!/bin/bash
cat <<'EOF'

${projectLines}

${config.projects.length} project(s)
EOF
`
);

// repo
writeExecutable(
  'usr/local/bin/repo',
  `#!/bin/bash
echo "${config.repoLink}"
`
);

// whoami — overrides busybox's whoami with the site's existing easter egg
const whoamiLines = [
  'In the kaleidoscope of existence, I am but a reflection questioning the enigma - who am I?',
  'Amidst cosmic whispers, I navigate the maze of self-discovery, echoing the eternal refrain - who am I?',
  'In the symphony of life, I am a note inquiring its own melody, harmonizing with the universal query - who am I?',
  'As stardust contemplating its journey, I ponder the cosmic query, silently asking - who am I?',
  'In the tapestry of reality, I am the thread of self-inquiry, weaving through the eternal question - who am I?',
];
writeExecutable(
  'usr/local/bin/whoami',
  `#!/bin/bash
LINES=(
${whoamiLines.map((l) => `  "${l}"`).join('\n')}
)
echo
echo "\${LINES[RANDOM % \${#LINES[@]}]}"
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
// config.json drives both these and the commands above.
const HOME = 'home/user';

writeText(
  `${HOME}/README.txt`,
  `${config.title}

You're in a real Alpine Linux VM running in your browser via CheerpX.
Nothing here is faked — poke around.

  about.txt        Who I am
  contact.txt      How to reach me
  projects/        What I've built

Standard commands work too (ls, cat, vi, ...). Try 'help' in the terminal.
`
);

writeText(`${HOME}/about.txt`, `${stripHtml(config.aboutGreeting)}\n`);

writeText(
  `${HOME}/contact.txt`,
  `Email      ${config.social.email}
Github     github.com/${config.social.github}
Linkedin   linkedin.com/in/${config.social.linkedin}
Repo       ${config.repoLink}
`
);

// One file per project, so the file browser has something to browse.
for (const [name, desc, link] of config.projects) {
  // Project names come from config.json and become filenames.
  const safeName = name.replace(/[^A-Za-z0-9._-]/g, '_');
  writeText(`${HOME}/projects/${safeName}.txt`, `${name}\n\n${desc}\n\n${link}\n`);
}

console.log('Generated portfolio content into', overlayDir);
