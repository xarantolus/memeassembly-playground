#!/usr/bin/env bash
set -euo pipefail

cd terminal
npm install

cp node_modules/xterm/css/xterm.css node_modules/xterm/lib/xterm.{js.map,js} ../dependencies

