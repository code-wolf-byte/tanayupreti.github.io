#!/usr/bin/env bash
# Builds a minimal Alpine (i386) ext2 disk image for the CheerpX-powered VM window.
# Re-run this whenever Dockerfile changes to regenerate public/webvm/alpine.ext2.
set -euo pipefail

cd "$(dirname "$0")"

node generate-content.mjs

IMAGE_NAME=webvm-alpine-build
CONTAINER_NAME=webvm-alpine-export
OUT_DIR="../../public/webvm"
OUT_FILE="$OUT_DIR/alpine.ext2"

ROOTFS_DIR=$(mktemp -d)
TAR_FILE=$(mktemp)

cleanup() {
  # The image contains read-only dirs (555), which plain rm can't descend into.
  chmod -R u+w "$ROOTFS_DIR" 2>/dev/null || true
  # Each step tolerates failure so one bad step can't strand the container.
  rm -rf "$ROOTFS_DIR" "$TAR_FILE" 2>/dev/null || true
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

command -v fakeroot >/dev/null || { echo "fakeroot is required (file ownership is lost without it)."; exit 1; }

docker build --platform linux/i386 -t "$IMAGE_NAME" -f Dockerfile .
docker create --platform linux/i386 --name "$CONTAINER_NAME" "$IMAGE_NAME" >/dev/null
docker export "$CONTAINER_NAME" -o "$TAR_FILE"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

# Extract and mkfs inside ONE fakeroot session. Unprivileged tar silently drops
# every file's ownership to the invoking user, which would hand uid 1000
# ownership of the whole filesystem (/etc included) and let it chmod away the
# read-only portfolio files. fakeroot's state is per-process-tree, so the
# extract and the mkfs that reads those owners must share one invocation.
fakeroot -- bash -euo pipefail -c '
  TAR_FILE="$1"; ROOTFS_DIR="$2"; OUT_FILE="$3"

  tar -xf "$TAR_FILE" -C "$ROOTFS_DIR"
  # Docker injects these at container-start time; strip them so the image stays clean.
  rm -f "$ROOTFS_DIR/.dockerenv" "$ROOTFS_DIR/etc/resolv.conf" "$ROOTFS_DIR/etc/hostname" "$ROOTFS_DIR/etc/hosts"

  SIZE_KB=$(du -sk "$ROOTFS_DIR" | cut -f1)
  IMG_SIZE_MB=$(( (SIZE_KB / 1024) + 16 )) # headroom for ext2 metadata + runtime scratch writes

  mkfs.ext2 -q -b 4096 -d "$ROOTFS_DIR" "$OUT_FILE" "${IMG_SIZE_MB}M"
' _ "$TAR_FILE" "$ROOTFS_DIR" "$OUT_FILE"

echo "Built $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
