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
  rm -rf "$ROOTFS_DIR" "$TAR_FILE"
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build --platform linux/i386 -t "$IMAGE_NAME" -f Dockerfile .
docker create --platform linux/i386 --name "$CONTAINER_NAME" "$IMAGE_NAME" >/dev/null
docker export "$CONTAINER_NAME" -o "$TAR_FILE"

tar -xf "$TAR_FILE" -C "$ROOTFS_DIR"
# Docker injects these at container-start time; strip them so the image stays clean.
rm -f "$ROOTFS_DIR/.dockerenv" "$ROOTFS_DIR/etc/resolv.conf" "$ROOTFS_DIR/etc/hostname" "$ROOTFS_DIR/etc/hosts"

SIZE_KB=$(du -sk "$ROOTFS_DIR" | cut -f1)
IMG_SIZE_MB=$(( (SIZE_KB / 1024) + 16 )) # headroom for ext2 metadata + runtime scratch writes

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"
mkfs.ext2 -q -b 4096 -d "$ROOTFS_DIR" "$OUT_FILE" "${IMG_SIZE_MB}M"

echo "Built $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
