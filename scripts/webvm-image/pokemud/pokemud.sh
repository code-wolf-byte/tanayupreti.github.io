#!/bin/bash
# The game saves team.json into its working directory, and everything under
# /home/user is read-only except scratch/. So play happens in a per-visitor
# copy there: symlinks for the data it only reads, a real file for the one it
# writes. That save survives across runs in the browser's overlay.
set -e
src=/usr/local/share/pokemud
# HOME is set by WebVmTerminal; the fallback keeps a bare shell (no env) from
# trying to write into /, which is root-owned and read-only.
dir="${HOME:-/home/user}/scratch/pokemud"

mkdir -p "$dir"
for f in rooms.json items.json pokemon.json moves.json; do
  [ -e "$dir/$f" ] || ln -s "$src/$f" "$dir/$f"
done
[ -e "$dir/team.json" ] || cp "$src/team.json" "$dir/team.json"

cd "$dir"
exec "$src/pokemud.bin"
