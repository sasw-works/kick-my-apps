#!/bin/sh
# Swap @vercel/postgres for a node-postgres stand-in (so the app can run against a plain local
# Postgres), or put the real package back.   Usage: tests/integration/setup-shim.sh enable|disable
# ALWAYS run "disable" before committing/deploying: node_modules isn't tracked, but a build made
# with the shim in place must never be used for anything real.
set -e
cd "$(dirname "$0")/../.."
PKG=node_modules/@vercel/postgres
case "$1" in
  enable)
    [ -d "$PKG.real" ] || mv "$PKG" "$PKG.real"
    mkdir -p "$PKG"
    printf '{ "name": "@vercel/postgres", "version": "0.0.0-local-test-shim", "main": "index.js" }\n' > "$PKG/package.json"
    cp tests/integration/vercel-postgres-shim.js "$PKG/index.js"
    echo "shim enabled (real package parked at $PKG.real)";;
  disable)
    if [ -d "$PKG.real" ]; then rm -rf "$PKG"; mv "$PKG.real" "$PKG"; echo "real @vercel/postgres restored"; else echo "nothing to restore"; fi;;
  *) echo "usage: $0 enable|disable"; exit 1;;
esac
