#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCK_FILE="${PR5_STACK_LOCK:-${ROOT}/infra/integration/stack-lock.json}"
RUNTIME_DIR="${PR5_RUNTIME_DIR:-${ROOT}/.runtime/pr5}"
SOURCE_DIR="${RUNTIME_DIR}/sources"
ARCHIVE_DIR="${RUNTIME_DIR}/archives"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "required command not found: $1" >&2
    exit 2
  }
}

require_command python3
require_command curl
require_command tar

read_lock() {
  python3 - "$LOCK_FILE" "$1" <<'PY'
import json
import sys
from pathlib import Path

lock = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
value = lock
for part in sys.argv[2].split("."):
    value = value[part]
print(value)
PY
}

REPOSITORY="$(read_lock repository)"
mkdir -p "$SOURCE_DIR" "$ARCHIVE_DIR"

materialize() {
  local name="$1"
  local sha="$2"
  local required_path="$3"
  local destination="${SOURCE_DIR}/${name}"
  local archive="${ARCHIVE_DIR}/${name}-${sha}.tar.gz"
  local marker="${destination}/.pr5-source-sha"

  if [[ -f "$marker" ]] && [[ "$(cat "$marker")" == "$sha" ]] && [[ -d "${destination}/${required_path}" ]]; then
    echo "source ${name} already materialized at ${sha}"
    return
  fi

  rm -rf "$destination"
  mkdir -p "$destination"

  if [[ ! -s "$archive" ]]; then
    local url="https://github.com/${REPOSITORY}/archive/${sha}.tar.gz"
    echo "downloading immutable ${name} source ${sha}"
    curl --fail --location --silent --show-error \
      --retry 5 --retry-delay 2 --retry-all-errors \
      --output "${archive}.tmp" "$url"
    mv "${archive}.tmp" "$archive"
  fi

  tar -xzf "$archive" --strip-components=1 -C "$destination"
  [[ -d "${destination}/${required_path}" ]] || {
    echo "snapshot ${name}@${sha} does not contain ${required_path}" >&2
    exit 3
  }
  printf '%s\n' "$sha" > "$marker"
}

BFF_SHA="$(read_lock siblings.bff.sha)"
BFF_PATH="$(read_lock siblings.bff.requiredPath)"
WEB_SHA="$(read_lock siblings.web.sha)"
WEB_PATH="$(read_lock siblings.web.requiredPath)"

materialize bff "$BFF_SHA" "$BFF_PATH"
materialize web "$WEB_SHA" "$WEB_PATH"

echo "integration sources prepared under ${SOURCE_DIR}"
