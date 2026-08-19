# AWS Staged Migration Guide

Use this guide after you have a server IP address and know whether the SSH username is `ubuntu` or `ec2-user`. Keep your private key on your own computer. Never copy it into `/opt`, the repository folder, GitHub, Vercel, or a ZIP archive.

## 1. Connect and inspect without changing anything

Run this on your own computer in Git Bash or Terminal. Replace the key path, SSH username, and server IP.

```bash
chmod 400 ~/Downloads/ssh-key-2026-07-18.key
ssh -i ~/Downloads/ssh-key-2026-07-18.key ubuntu@SERVER_PUBLIC_IP
```

After login, run this read-only inspection. It does not delete, stop, or modify anything.

```bash
hostnamectl
df -h
free -h
docker --version
docker compose version
docker ps -a
docker volume ls
sudo find /opt /srv /var/www -maxdepth 3 -type d -name '*sk*coder*' -o -name '*backend*' 2>/dev/null
```

Copy the output into a private note. Use it to identify the actual old application folder and Docker volume before you delete anything.

## 2. Back up the old application

Replace `OLD_APPLICATION_FOLDER` with the exact folder found during inspection. Do not guess the path. This command copies the old application files into a timestamped backup archive.

```bash
export OLD_APPLICATION_FOLDER=/opt/OLD_APPLICATION_FOLDER
test -d "$OLD_APPLICATION_FOLDER" && sudo tar -czf "/root/old-sk-coder-files-$(date +%F-%H%M).tar.gz" -C "$(dirname "$OLD_APPLICATION_FOLDER")" "$(basename "$OLD_APPLICATION_FOLDER")"
```

If the inspection shows an old Docker workspace volume, record its exact name and back it up separately:

```bash
export OLD_WORKSPACE_VOLUME=EXACT_OLD_VOLUME_NAME
sudo docker run --rm -v "$OLD_WORKSPACE_VOLUME":/data:ro -v /root:/backup alpine tar -czf "/backup/old-sk-coder-workspace-$(date +%F-%H%M).tar.gz" -C /data .
```

Download these backup files to a private local drive before any cleanup.

## 3. Deploy the new backend in a separate folder

Do not use the folder containing your SSH keys. On the AWS or Oracle server, create a new application folder:

```bash
sudo mkdir -p /opt/sk-coder-backend
sudo chown $USER:$USER /opt/sk-coder-backend
cd /opt/sk-coder-backend
```

Either clone the public repository or upload and extract the backend-only archive.

```bash
git clone https://github.com/RaoSaqlainM/sk-coder-deploy.git source
cd source
```

For the backend archive instead:

```bash
unzip ~/Downloads/sk-coder-backend-deploy.zip
cd sk-coder-backend
```

Create the live server configuration from the safe template, then add your real Vercel and custom frontend URLs:

```bash
cp deploy/server-config.example .env
nano .env
```

```dotenv
BACKEND_PORT=3001
ALLOWED_ORIGINS=https://YOUR_PROJECT.vercel.app,https://code.yourdomain.com
```

Start the isolated backend stack:

```bash
docker compose -f deploy/docker-compose.backend.yml build runtime
docker compose -f deploy/docker-compose.backend.yml up -d --build
curl -fsS http://127.0.0.1:3001/api/healthz
```

The health endpoint must return JSON with `"status":"ok"` before you connect Vercel.

## 4. Publish the backend API safely

Copy `deploy/sk-coder-api.nginx.conf` to Nginx, replace `api.example.com` with your API domain, then enable it and issue HTTPS:

```bash
sudo cp deploy/sk-coder-api.nginx.conf /etc/nginx/sites-available/sk-coder-api
sudo nano /etc/nginx/sites-available/sk-coder-api
sudo ln -s /etc/nginx/sites-available/sk-coder-api /etc/nginx/sites-enabled/sk-coder-api
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
curl -fsS https://api.yourdomain.com/api/healthz
```

Set these Vercel variables and redeploy the frontend:

```text
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com/api/ws/terminal
```

Test the Vercel frontend, source execution, Preview, project save, and SK Shell before touching the old server data.

## 5. Cleanup only after backup and successful verification

Do not run this section until the new backend works and you have downloaded the backups. Replace the placeholders with values verified during the read-only inspection. This removes only the selected old application folder and selected old workspace volume. It does not remove SSH keys, the operating system, Docker itself, or other applications.

```bash
export OLD_APPLICATION_FOLDER=/opt/EXACT_OLD_APPLICATION_FOLDER
export OLD_WORKSPACE_VOLUME=EXACT_OLD_VOLUME_NAME
sudo rm -rf -- "$OLD_APPLICATION_FOLDER"
sudo docker volume rm "$OLD_WORKSPACE_VOLUME"
```

Do not use `sudo rm -rf /`, do not delete `/home`, and do not use unrestricted Docker prune commands on a server that may host other applications.
