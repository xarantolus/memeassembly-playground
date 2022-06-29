#!/usr/bin/env bash
set -euo pipefail

cd /opt

if [ -d "emsdk" ]; then
    echo "emsdk already downloaded"
else
    git clone https://github.com/emscripten-core/emsdk.git

    cd emsdk

    ./emsdk install latest
    ./emsdk activate latest
fi

export PATH="/opt/emsdk/upstream/emscripten/:$PATH"
