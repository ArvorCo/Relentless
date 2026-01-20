#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FEATURE="999-auto-mode-smoke-test"
FEATURE_DIR="$ROOT_DIR/relentless/features/$FEATURE"
PRD="$FEATURE_DIR/prd.json"
BACKUP="$FEATURE_DIR/prd.backup.json"
CONFIG_PATH="$ROOT_DIR/relentless/config.json"
CONFIG_BACKUP="$FEATURE_DIR/config.backup.json"
DROID_OVERRIDE_CONFIG="$FEATURE_DIR/configs/auto-mode-droid-expert.json"
export RELENTLESS_EXECUTION_TIMEOUT_MS="${RELENTLESS_EXECUTION_TIMEOUT_MS:-60000}"
export RELENTLESS_SMOKE_MAX_ITERATIONS="${RELENTLESS_SMOKE_MAX_ITERATIONS:-6}"

CONFIG_PRESENT=0

if [[ ! -f "$BACKUP" ]]; then
  cp "$PRD" "$BACKUP"
fi

if [[ -f "$CONFIG_PATH" ]]; then
  cp "$CONFIG_PATH" "$CONFIG_BACKUP"
  CONFIG_PRESENT=1
fi

restore_config() {
  if [[ $CONFIG_PRESENT -eq 1 ]]; then
    cp "$CONFIG_BACKUP" "$CONFIG_PATH"
  else
    rm -f "$CONFIG_PATH"
  fi
}

apply_config() {
  local config_path="$1"

  restore_config
  if [[ -n "$config_path" ]]; then
    cp "$config_path" "$CONFIG_PATH"
  fi
}

trap restore_config EXIT

reset_prd() {
  cp "$BACKUP" "$PRD"
}

run_mode() {
  local mode="$1"
  local fallback_order="$2"
  local config_path="$3"

  reset_prd
  apply_config "$config_path"
  echo "\n=== Running mode: $mode ==="

  local cmd=(bun run bin/relentless.ts run --feature "$FEATURE" --agent auto --mode "$mode" --skip-review --max-iterations "$RELENTLESS_SMOKE_MAX_ITERATIONS")
  if [[ -n "$fallback_order" ]]; then
    cmd+=(--fallback-order "$fallback_order")
  fi

  set +e
  "${cmd[@]}"
  local status=$?
  set -e

  if [[ $status -ne 0 ]]; then
    echo "Mode '$mode' exited with status $status"
  fi
}

set -e
FALLBACK_DEFAULT=""
FALLBACK_ALT="opencode,amp,claude,codex,droid,gemini"

for mode in free cheap good genius; do
  run_mode "$mode" "$FALLBACK_DEFAULT" ""
done

run_mode "cheap" "$FALLBACK_ALT" ""
run_mode "cheap" "$FALLBACK_DEFAULT" "$DROID_OVERRIDE_CONFIG"

reset_prd
apply_config ""
echo "\n=== Dry-run review-mode sanity check ==="
bun run bin/relentless.ts run \
  --feature "$FEATURE" \
  --agent auto \
  --mode good \
  --review-mode genius \
  --dry-run \
  --max-iterations "$RELENTLESS_SMOKE_MAX_ITERATIONS"

restore_config
