#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${project_dir}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Run: bash scripts/server-setup-ubuntu.sh"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is not installed. Run: bash scripts/server-setup-ubuntu.sh"
  exit 1
fi

if [ ! -f ".env.production" ]; then
  echo ".env.production is missing. Creating from .env.production.example..."
  cp .env.production.example .env.production
fi

if [ ! -f "certs/apiclient_key.pem" ] || [ ! -f "certs/pub_key.pem" ]; then
  echo "Warning: certs/apiclient_key.pem or certs/pub_key.pem is missing."
  echo "Wechat Pay will stay disabled until certificate files are present."
fi

missing_admin=0
grep -q "^ADMIN_USERNAME=." .env.production || missing_admin=1
grep -q "^ADMIN_PASSWORD_HASH=." .env.production || missing_admin=1
grep -q "^ADMIN_SESSION_SECRET=." .env.production || missing_admin=1
if [ "${missing_admin}" -eq 1 ]; then
  echo "Warning: admin credentials are not fully configured. /admin will stay disabled."
  echo "Generate them locally with: npm run admin:hash -- \"your-strong-password\""
  echo "Or on server with Docker: bash scripts/admin-hash-docker.sh \"your-strong-password\""
fi

missing_wechat=0
grep -q "^WECHAT_PAY_API_V3_KEY=." .env.production || missing_wechat=1
grep -q "^WECHAT_PAY_PUBLIC_KEY_ID=." .env.production || missing_wechat=1
if [ "${missing_wechat}" -eq 1 ]; then
  echo "Warning: Wechat Pay is not fully configured. Payment button will show channel unavailable."
fi

missing_wechat_oauth=0
grep -q "^WECHAT_MP_APP_SECRET=." .env.production || missing_wechat_oauth=1
grep -q "^WECHAT_OAUTH_SESSION_SECRET=." .env.production || missing_wechat_oauth=1
if [ "${missing_wechat_oauth}" -eq 1 ]; then
  echo "Warning: Wechat OAuth is not fully configured. JSAPI payment in WeChat cannot get openid yet."
fi

echo "Building and starting Docker service..."
docker compose up -d --build

echo "Waiting for health check..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "Health check passed."
    docker compose ps
    echo
    echo "Local app: http://127.0.0.1:3000"
    echo "Public domain: https://soul-major.cn"
    exit 0
  fi
  sleep 2
done

echo "Health check failed. Recent logs:"
docker compose logs --tail=80 soul-major
exit 1
