#!/bin/bash
set -euo pipefail

LIMIT="${LINE_LIMIT:-1200}"

is_governed() {
  case "$1" in
    src/data/* | */__tests__/*) return 1 ;;
    src/*.js | src/*.vue | scripts/*.mjs) return 0 ;;
    *) return 1 ;;
  esac
}

status=0
checked=0
while IFS= read -r f; do
  is_governed "$f" || continue
  [ -f "$f" ] || continue
  checked=$((checked + 1))
  n=$(wc -l <"$f")
  if ((n > LIMIT)); then
    printf 'LINE LIMIT: %s has %d lines (max %d)\n' "$f" "$n" "$LIMIT" >&2
    status=1
  fi
done < <(if [ $# -gt 0 ]; then printf '%s\n' "$@"; else git ls-files; fi)

if ((status != 0)); then
  printf '\nSplit the file(s) above into focused modules.\n' >&2
  exit 1
fi
printf 'line-limit OK (<= %d lines): %d files checked\n' "$LIMIT" "$checked"
