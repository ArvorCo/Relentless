#!/usr/bin/env bash
# common.sh - Shared functions for learning extraction scripts

# Detect available search tool (prefer ripgrep for speed)
detect_grep() {
  if command -v rg >/dev/null 2>&1; then
    echo "rg"
  else
    echo "grep"
  fi
}

# Escape string for JSON
json_escape() {
  local str="$1"
  # Escape backslashes, quotes, and control characters
  printf '%s' "$str" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' | tr '\n' ' '
}

# Convert array of strings to JSON array
to_json_array() {
  local first=true
  echo -n "["
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if [[ "$first" == "true" ]]; then
      first=false
    else
      echo -n ","
    fi
    echo -n "\"$(json_escape "$line")\""
  done
  echo "]"
}

# Extract feature name from path
get_feature_name() {
  local path="$1"
  basename "$path"
}

# Check if file exists and is readable
check_file() {
  local path="$1"
  [[ -f "$path" && -r "$path" ]]
}
