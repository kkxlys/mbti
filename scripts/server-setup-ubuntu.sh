#!/usr/bin/env bash
set -euo pipefail

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This setup script supports Ubuntu/Debian servers with apt-get."
  exit 1
fi

os_id="$(. /etc/os-release && echo "$ID")"
os_codename="$(. /etc/os-release && echo "${VERSION_CODENAME}")"

case "${os_id}" in
  ubuntu|debian)
    ;;
  *)
    echo "Unsupported OS: ${os_id}. This script supports Ubuntu/Debian."
    exit 1
    ;;
esac

echo "Installing Docker Engine and Docker Compose plugin for ${os_id} ${os_codename}..."

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg unzip

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL "https://download.docker.com/linux/${os_id}/gpg" -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

architecture="$(dpkg --print-architecture)"

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/${os_id}
Suites: ${os_codename}
Components: stable
Architectures: ${architecture}
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

echo
docker --version
docker compose version
echo
echo "Docker is ready. If you want to run docker without sudo, run:"
echo "  sudo usermod -aG docker \$USER"
echo "Then log out and log back in."
