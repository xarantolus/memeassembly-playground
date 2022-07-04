#!/usr/bin/env bash
set -euo pipefail

echo "::group::Building TypeScript files"
npm i
npm run build
echo "::endgroup::"

# Create output dir
mkdir -p dependencies

echo "::group::Downloading language configuration"
./build/download_language_config.sh
echo "::endgroup::"

echo "::group::Installing Emscripten"
./build/install_emcc.sh
source "/opt/emsdk/emsdk_env.sh"
echo "::endgroup::"

echo "::group::Installing wasm-pack"
./build/install_wasm_pack.sh
echo "::endgroup::"

echo "::group::Installing xterm"
./build/install_xterm.sh
echo "::endgroup::"

echo "::group::Building MemeAssembly"
./build/build_memeassembly.sh
echo "::endgroup::"

echo "::group::Building AssemblyScript"
./build/build_assemblyscript.sh
echo "::endgroup::"

echo "::group::Building Unicorn Engine"
./build/build_unicorn.sh
echo "::endgroup::"
