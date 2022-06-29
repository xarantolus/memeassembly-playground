#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(pwd)"

TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

git clone "https://github.com/kammt/MemeAssembly.git"

cd MemeAssembly

git am $BASE_DIR/build/patches/*.patch

mkdir -p wasm

make wasm

cp "wasm/memeasm.js" "$BASE_DIR/dependencies/memeasm.js"
cp "wasm/memeasm.wasm" "$BASE_DIR/dependencies/memeasm.wasm"
