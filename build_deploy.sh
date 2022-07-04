#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR=deploy

echo "::group::Creating deploy directory"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
echo "::endgroup::"


echo "::group::Copying files"
cp -r dependencies index.html "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/scripts"
cp -r scripts/*.js "$DEPLOY_DIR/scripts"
