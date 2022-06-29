#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(pwd)"

TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

git clone "https://github.com/xarantolus/unicorn.js.git"

cd "unicorn.js"

git submodule update --init

npm install --also=dev

npm install -g grunt

grunt "build:x86"

cp "dist/unicorn-x86.min.js" "$BASE_DIR/dependencies/unicorn-x86.min.js"
