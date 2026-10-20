#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCS_API_DIR="${SDK_DIR}/docs/api"
FULL_MD="${DOCS_API_DIR}/_full.md"

export PATH="${PATH}:$(go env GOPATH)/bin"

if ! command -v gomarkdoc >/dev/null 2>&1; then
  echo "gomarkdoc not found. Install with:"
  echo "  go install github.com/princjef/gomarkdoc/cmd/gomarkdoc@latest"
  exit 1
fi

mkdir -p "${DOCS_API_DIR}"

echo "[1/2] Running gomarkdoc..."
( cd "${SDK_DIR}" && gomarkdoc --format plain --output "${FULL_MD}" . )

echo "[2/2] Splitting ${FULL_MD} into per-module pages..."
python3 "${SCRIPT_DIR}/split_api_docs.py" "${FULL_MD}" "${DOCS_API_DIR}"

echo
echo "API reference regenerated:"
ls -la "${DOCS_API_DIR}"/*.md | grep -v _full.md
