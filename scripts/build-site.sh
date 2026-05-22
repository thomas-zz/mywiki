#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

echo "📦 构建 site standalone..."

cd "$ROOT/site"
npm install
WIKI_DIR=/dev/null AUTH_ENABLED=false npx next build

rm -rf "$ROOT/site-dist"
cp -r .next/standalone "$ROOT/site-dist"
mkdir -p "$ROOT/site-dist/.next/static"
cp -r .next/static/* "$ROOT/site-dist/.next/static/"

# Clean up unnecessary files from standalone output
rm -rf "$ROOT/site-dist/out" \
       "$ROOT/site-dist/src" \
       "$ROOT/site-dist/scripts" \
       "$ROOT/site-dist/public/public" \
       "$ROOT/site-dist/tsconfig.json" \
       "$ROOT/site-dist/tsconfig.tsbuildinfo" \
       "$ROOT/site-dist/eslint.config.mjs" \
       "$ROOT/site-dist/postcss.config.mjs" \
       "$ROOT/site-dist/next.config.ts" \
       "$ROOT/site-dist/AGENTS.md" \
       "$ROOT/site-dist/CLAUDE.md" \
       "$ROOT/site-dist/README.md" \
       "$ROOT/site-dist/package-lock.json"

echo "✅ site-dist/ 构建完成 ($(du -sh "$ROOT/site-dist" | cut -f1))"
