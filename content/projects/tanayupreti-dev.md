[project]
name = "tanayupreti.dev"
tagline = "This site: a desktop in the browser with a real Linux VM."
link = "https://github.com/code-wolf-byte/tanayupreti.github.io"
status = "active"
year = "2022"
stack = ["TypeScript", "Vite", "CheerpX", "xterm.js"]

[content]
A portfolio built as a desktop environment. The terminal is a real x86 Alpine
Linux, compiled to WebAssembly with CheerpX and booted in the tab.

- Windows, taskbar and lock screen driven by one session state behind a pub/sub bus
- `open <file>` in the Linux shell opens a desktop window through a private terminal escape code
- Content written once as Markdown, used by the windows, the VM image and static pages for search engines
- Deep links: every project has its own URL, and the desktop opens to it
