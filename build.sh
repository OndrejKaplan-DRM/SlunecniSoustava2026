#!/bin/sh
cd /home/claude/s200 && npx esbuild src/main.js --bundle --minify --format=iife --outfile=dist/app.js --loader:.json=json --log-level=error
