#!/usr/bin/env bash
set -euo pipefail

password="${1:-}"
if [ -z "${password}" ]; then
  echo "Usage: bash scripts/admin-hash-docker.sh \"at-least-12-chars-password\""
  exit 1
fi

docker run --rm \
  -v "$(pwd)/scripts/hash-admin-password.mjs:/hash-admin-password.mjs:ro" \
  node:22-alpine \
  node /hash-admin-password.mjs "${password}"
