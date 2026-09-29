[project]
name = "linux-config"
tagline = "Dotfiles, system files and package lists for my CachyOS machines."
link = "https://github.com/code-wolf-byte/linux-config"
status = "active"
year = "2026"
stack = ["Lua", "Shell", "Python", "chezmoi"]

[content]
One repository that sets up a machine from scratch: dotfiles applied with
chezmoi, system files under `/` applied by a script, and per-host package
lists and systemd units.

- Hyprland (Lua config), COSMIC, fish, kitty and the rest of the desktop
- Per-host overrides, such as fan curves and GPU modes for an ASUS ROG Flow Z13
- A pre-commit hook that blocks likely secrets from being committed
