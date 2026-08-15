#!/bin/bash
# SK Coder Backend Setup Script
# Oracle EC2 Free Tier Ubuntu 22.04 LTS
# Run as: bash setup-backend.sh

set -e

echo "🚀 SK Coder Backend Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check OS
if ! [[ -f /etc/os-release ]]; then
  echo -e "${RED}Error: Unsupported OS${NC}"
  exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
echo -e "${YELLOW}Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs npm

# Install Docker
echo -e "${YELLOW}Installing Docker...${NC}"
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ${USER}
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
echo -e "${YELLOW}Installing Docker Compose...${NC}"
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Python 3.11
echo -e "${YELLOW}Installing Python 3.11...${NC}"
sudo apt-get install -y python3.11 python3-pip python3.11-venv
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Install Git
echo -e "${YELLOW}Installing Git...${NC}"
sudo apt-get install -y git

# Clone SK Coder repository (if not already present)
if [[ ! -d /opt/sk-coder ]]; then
  echo -e "${YELLOW}Cloning SK Coder repository...${NC}"
  sudo mkdir -p /opt
  sudo git clone https://github.com/yourusername/sk-coder.git /opt/sk-coder
  sudo chown -R ${USER}:${USER} /opt/sk-coder
fi

cd /opt/sk-coder/api-server

# Install Node.js dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
npm install

# Create .env file
echo -e "${YELLOW}Creating .env file...${NC}"
cat > .env << EOF
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
PISTON_API_URL=https://emkc.org/api/v2
WANDBOX_API_URL=https://wandbox.org/api
ORACLE_STORAGE_PATH=/mnt/storage
MAX_EXECUTION_TIME=30000
MAX_FILE_SIZE=52428800
CLEANUP_INTERVAL=259200000
EOF

echo -e "${GREEN}✓ .env created${NC}"

# Create storage directory
echo -e "${YELLOW}Creating storage directory...${NC}"
sudo mkdir -p /mnt/storage
sudo chown -R ${USER}:${USER} /mnt/storage
chmod 755 /mnt/storage

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build

# Test build
echo -e "${YELLOW}Testing build...${NC}"
npm run build

# Create systemd service
echo -e "${YELLOW}Creating systemd service...${NC}"
sudo tee /etc/systemd/system/sk-coder-api.service > /dev/null << EOF
[Unit]
Description=SK Coder API Server
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=${USER}
WorkingDirectory=/opt/sk-coder/api-server
Environment="NODE_ENV=production"
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/bin/node"
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sk-coder-api

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo -e "${YELLOW}Enabling SK Coder API service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable sk-coder-api
sudo systemctl start sk-coder-api

# Verify service
sleep 2
if sudo systemctl is-active --quiet sk-coder-api; then
  echo -e "${GREEN}✓ SK Coder API service running${NC}"
else
  echo -e "${RED}✗ Failed to start SK Coder API service${NC}"
  sudo systemctl status sk-coder-api
  exit 1
fi

# Setup nginx reverse proxy (optional)
echo -e "${YELLOW}Setting up nginx reverse proxy...${NC}"
sudo apt-get install -y nginx

sudo tee /etc/nginx/sites-available/sk-coder > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    server_name _;
    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
    }

    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/sk-coder /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt (optional)
echo -e "${YELLOW}Setting up SSL (optional)...${NC}"
sudo apt-get install -y certbot python3-certbot-nginx

echo ""
echo -e "${GREEN}✓ Backend setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set your domain in nginx config"
echo "2. Run: sudo certbot --nginx -d yourdomain.com"
echo "3. Check logs: journalctl -u sk-coder-api -f"
echo "4. Test API: curl http://localhost:3001/health"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status sk-coder-api"
echo "  sudo systemctl restart sk-coder-api"
echo "  journalctl -u sk-coder-api -f"
echo "  sudo systemctl status nginx"
echo ""
