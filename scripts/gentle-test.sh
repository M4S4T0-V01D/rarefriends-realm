#!/usr/bin/env bash
# Runs test files one at a time, gently: lowest CPU priority, a hard memory ceiling (6 GB unless TEST_MEMORY says otherwise; no swap) and a time limit,
# so a runaway test fails on its own instead of taking the machine with it. Extra node --test flags go after "--".
#   scripts/gentle-test.sh tests/engine.test.mjs -- --test-name-pattern="the world is large"
set -u
files=(); flags=()
while [ $# -gt 0 ]; do if [ "$1" = "--" ]; then shift; flags=("$@"); break; fi; files+=("$1"); shift; done
[ ${#files[@]} -eq 0 ] && files=(tests/*.test.mjs)
status=0
for file in "${files[@]}"; do
  echo "== $file"
  systemd-run --user --scope -q -p MemoryMax="${TEST_MEMORY:-6G}" -p MemorySwapMax=0 \
    nice -n 19 timeout "${TEST_TIMEOUT:-600}" node --test --test-concurrency=1 "${flags[@]}" "$file" || status=1
done
exit $status
