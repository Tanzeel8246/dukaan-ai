#!/usr/bin/env bash
# Restore binary assets that were pushed to GitHub as base64 text
# files (<path>.b64) because the connector route used for the F1
# snapshot carries UTF-8 text only. Decodes every *.b64 file in the
# repository tree back to its real path. Idempotent: files already
# restored with identical content are left untouched.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
found=0
while IFS= read -r -d '' b64; do
  target="${b64%.b64}"
  tmp="$(mktemp)"
  tr -d '[:space:]' < "$b64" | base64 -d > "$tmp"
  if [ -f "$target" ] && cmp -s "$tmp" "$target"; then
    echo "unchanged: ${target}"
  else
    mkdir -p "$(dirname "$target")"
    mv "$tmp" "$target"
    echo "restored: ${target}"
  fi
  rm -f "$tmp"
  found=$((found+1))
done < <(find . -name '*.b64' -not -path './.git/*' -print0)
echo "restore-binaries: processed ${found} .b64 file(s)"
