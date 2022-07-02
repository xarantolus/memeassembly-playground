#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(pwd)"

TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# Download language configuration from my VSCode extension
curl -L https://raw.githubusercontent.com/xarantolus/MemeAssembly-vscode/main/syntaxes/memeasm.tmLanguage.json > memeasm.tmLanguage.max.json
curl -L https://raw.githubusercontent.com/xarantolus/MemeAssembly-vscode/main/language-configuration.json >      language-configuration.max.json

# Remove comments from the language configuration file
sed -i 's://.*$::g' language-configuration.max.json

sudo apt-get install -y jq

# Minify these files
jq -r tostring language-configuration.max.json > language-configuration.json
jq -r tostring memeasm.tmLanguage.max.json > memeasm.tmLanguage.json

# Now copy the minified files to the correct locations
cp memeasm.tmLanguage.json "$BASE_DIR/dependencies/memeasm.tmLanguage.json"
cp language-configuration.json "$BASE_DIR/dependencies/language-configuration.json"
