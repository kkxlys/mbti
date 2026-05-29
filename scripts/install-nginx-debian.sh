#!/usr/bin/env bash
set -euo pipefail

domain="${1:-soul-major.cn}"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This setup script supports Ubuntu/Debian servers with apt-get."
  exit 1
fi

echo "Installing Nginx and Certbot for ${domain}..."

sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

sudo tee "/etc/nginx/sites-available/${domain}" >/dev/null <<EOF
server {
    listen 80;
    server_name ${domain} www.${domain};

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -sf "/etc/nginx/sites-available/${domain}" "/etc/nginx/sites-enabled/${domain}"
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

echo
echo "Nginx HTTP reverse proxy is ready."
echo "Make sure DNS A records for ${domain} and www.${domain} point to this server."
echo "Make sure ports 80 and 443 are open in the server firewall/security group."
echo
echo "After DNS is ready, run:"
echo "  sudo certbot --nginx -d ${domain} -d www.${domain}"
