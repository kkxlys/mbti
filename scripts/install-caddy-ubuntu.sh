#!/usr/bin/env bash
set -euo pipefail

domain="${1:-soul-major.cn}"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This setup script supports Ubuntu/Debian servers with apt-get."
  exit 1
fi

echo "Installing Caddy and configuring reverse proxy for ${domain}..."

sudo apt-get update
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl

curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null

sudo apt-get update
sudo apt-get install -y caddy

sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
${domain}, www.${domain} {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
EOF

sudo systemctl enable --now caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy

echo
echo "Caddy is ready for https://${domain}"
echo "Make sure DNS A records for ${domain} and www.${domain} point to this server."
echo "Also open ports 80 and 443 in the server firewall/security group."
