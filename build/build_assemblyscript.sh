#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(pwd)"

TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

git clone "https://github.com/xarantolus/assembly-script.git"

cd assembly-script

make

cp "pkg/assembly_script.js" "$BASE_DIR/dependencies/assembly_script.js"
cp "pkg/assembly_script_bg.wasm" "$BASE_DIR/dependencies/assembly_script_bg.wasm"
cp pkg/*.ts "$BASE_DIR/dependencies"
