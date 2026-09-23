#!/usr/bin/env bash
# Exercises src/webvm/vm.ts against the real public/webvm/alpine.ext2 in a
# headless browser. CheerpX needs SharedArrayBuffer, so this can't run in node:
# server.mjs supplies the COOP/COEP headers (and the Range + Last-Modified
# support HttpBytesDevice requires).
#
# Set CHROME=/path/to/chrome to override browser discovery.
set -euo pipefail

cd "$(dirname "$0")"
REPO_ROOT="../.."
IMAGE="$REPO_ROOT/public/webvm/alpine.ext2"
PORT=8099

[ -f "$IMAGE" ] || { echo "Missing $IMAGE — run scripts/webvm-image/build.sh first."; exit 1; }

if [ -z "${CHROME:-}" ]; then
  for candidate in \
    "$(command -v google-chrome-stable || true)" \
    "$(command -v chromium || true)" \
    "$(command -v chromium-browser || true)" \
    "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux64/chrome; do
    if [ -x "$candidate" ]; then CHROME="$candidate"; break; fi
  done
fi
[ -n "${CHROME:-}" ] || { echo "No Chrome/Chromium found. Set CHROME=/path/to/chrome."; exit 1; }

# A busy port otherwise surfaces as a mystifying timeout: the browser happily
# loads whatever else is listening there.
if (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | grep -q ":$PORT "; then
  echo "Port $PORT is already in use — stop that process and retry."
  exit 1
fi

RESULT=$(mktemp)
PROFILE=$(mktemp -d)
cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
  [ -n "${CHROME_PID:-}" ] && kill "$CHROME_PID" 2>/dev/null || true
  rm -rf "$PROFILE" "$RESULT" vmtest.js
}
trap cleanup EXIT

"$REPO_ROOT/node_modules/.bin/esbuild" vmtest.ts --bundle --format=esm --outfile=vmtest.js --log-level=warning

node server.mjs . "$IMAGE" > "$RESULT" 2>/dev/null &
SERVER_PID=$!
sleep 1

"$CHROME" --headless=new --no-sandbox --disable-gpu --user-data-dir="$PROFILE" \
  "http://localhost:$PORT/vmtest.html" >/dev/null 2>&1 &
CHROME_PID=$!

# 60 was enough before the guest ran a real program. PokéMUD's first launch
# pages ~100KB of JSON in over range requests, cold, which alone costs ~45s.
for _ in $(seq 1 120); do
  [ -s "$RESULT" ] && break
  sleep 2
done

if [ ! -s "$RESULT" ]; then
  echo "TIMEOUT: the page never reported back."
  exit 1
fi

cat "$RESULT"
grep -q '"SUMMARY": "ALL PASS"' "$RESULT"
