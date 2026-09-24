#!/bin/bash
# check-line-limit.sh - fail if any hand-written source file exceeds the limit.
#
# Usage:
#   scripts/check-line-limit.sh            # scan the repo source set (full tree)
#   scripts/check-line-limit.sh FILE...    # check only the given files (local hook)
#
# Override the cap with LINE_LIMIT.
#
# Cap history:
#   1200 - repo high-water mark when adopted (src/App.vue 1966, DraftPanel.vue 1709
#          are the known offenders; everything else passes).
set -euo pipefail

LIMIT="${LINE_LIMIT:-1200}"

# Folders this check never governs, even when the file matches the source set.
# Substring match, so 'src/data/' skips everything beneath it.
EXCLUDE_DIRS=(
  'src/data/'      # hand-maintained data tables (pokemon definitions)
  '/__tests__/'    # spec suites
)

# Is PATH one of the source files this check governs? Adjust per repo.
is_source() {
  local f="$1" ex
  case "$f" in
    src/*.js | src/*.vue | scripts/*.mjs) ;;
    *) return 1 ;;
  esac
  for ex in ${EXCLUDE_DIRS[@]+"${EXCLUDE_DIRS[@]}"}; do
    [[ "$f" == *"$ex"* ]] && return 1
  done
  return 0
}

# The full governed set, for the no-argument (full-tree) scan.
collect_default() {
  git ls-files
}

files=()
if [[ $# -gt 0 ]]; then
  for f in "$@"; do is_source "$f" && [[ -f "$f" ]] && files+=("$f"); done
else
  while IFS= read -r f; do is_source "$f" && [[ -f "$f" ]] && files+=("$f"); done < <(collect_default)
fi

status=0
checked=0
for f in ${files[@]+"${files[@]}"}; do
  [[ -z "$f" ]] && continue
  checked=$((checked + 1))
  n=$(wc -l <"$f")
  if ((n > LIMIT)); then
    printf 'LINE LIMIT: %s has %d lines (max %d)\n' "$f" "$n" "$LIMIT" >&2
    status=1
  fi
done

if ((status != 0)); then
  printf '\nSplit the file(s) above into focused modules.\n' >&2
  exit 1
fi
printf 'line-limit OK (<= %d lines): %d files checked\n' "$LIMIT" "$checked"
