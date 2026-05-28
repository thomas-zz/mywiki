#!/usr/bin/env bash
# pre-commit check: warn if publishable files changed but version didn't bump

PUBLISH_PATHS="^(site/|bin/|lib/|docs/mywiki/|templates/)"

staged=$(git diff --cached --name-only)

has_publish_change=false
has_version_change=false

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if echo "$file" | grep -qE "$PUBLISH_PATHS"; then
    has_publish_change=true
  fi
  if [[ "$file" == "package.json" ]]; then
    if git diff --cached package.json | grep -q '"version"'; then
      has_version_change=true
    fi
  fi
done <<< "$staged"

if $has_publish_change && ! $has_version_change; then
  echo ""
  echo "⚠️  检测到发布内容变更但 package.json version 未更新"
  echo "   如果本次提交需要发布，请记得升版本号。"
  echo "   跳过检查: git commit --no-verify"
  echo ""
fi
