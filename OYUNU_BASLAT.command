#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd -P)"
TARGET_FILE="${SCRIPT_DIR}/index.html"
if [[ ! -f "${TARGET_FILE}" ]]; then
  echo "Error: index.html not found in ${SCRIPT_DIR}" >&2
  exit 1
fi
open -- "${TARGET_FILE}"
