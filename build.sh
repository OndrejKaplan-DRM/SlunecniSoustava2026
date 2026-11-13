#!/bin/sh
cd "$(dirname "$0")" && npx esbuild src/main.js --bundle --minify --format=iife --outfile=dist/app.js --loader:.json=json --log-level=error
