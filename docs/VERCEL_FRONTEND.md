# Vercel Frontend Deployment Guide

Use Vercel only for the SK Coder frontend. The backend must stay on AWS or Oracle because it needs Docker, persistent workspace storage, language runtimes, and terminal WebSockets.

> Never upload `sk-key.pem`, `ssh-key-2026-07-18.key`, any `.pem` file, any `.key` file, `.env`, workspace data, backups, or database files to GitHub or Vercel.

## 1. Use the correct terminal on your own computer

Use **Git Bash** on Windows or the built-in **Terminal** on macOS and Linux for GitHub commands. Use **PowerShell** only if you prefer it and Git is already installed. Use the server SSH terminal only for AWS or Oracle commands. Do not use the Node.js terminal for Git commands or server administration.

| Task | Correct place |
|---|---|
| Copy the repository to another GitHub account | Git Bash or local Terminal on your computer. |
| Build and deploy the frontend | Vercel dashboard after connecting GitHub. |
| Run Docker, backend, terminals, and language runtime | AWS or Oracle SSH terminal. |
| Keep SSH keys | Your own computer only. |

## 2. Copy the repository to the other GitHub account

Sign in to the new GitHub account, create a new **private** empty repository, and do not add a README or `.gitignore` during creation. Then open Git Bash or Terminal on your own computer and run the following commands. Replace the two example repository URLs with your real old and new repository URLs.

```bash
git clone --mirror https://github.com/OLD_ACCOUNT/sk-code-main.git
cd sk-code-main.git
git push --mirror https://github.com/NEW_ACCOUNT/sk-coder.git
cd ..
rm -rf sk-code-main.git
```

If GitHub requests authentication, use your new account’s GitHub sign-in flow or a fine-grained access token with access to the new private repository. Do not place the token inside any project file.

## 3. Deploy the frontend through Vercel

In Vercel, select **Add New Project**, choose the repository from the new GitHub account, and use the following values:

| Vercel field | Value |
|---|---|
| Framework preset | Vite |
| Root Directory | `frontend` |
| Install Command | `pnpm install` |
| Build Command | `pnpm run build` |
| Output Directory | `dist/public` |

Set these environment variables in Vercel before the first production deployment. They are public browser endpoints, not passwords or private keys.

| Vercel variable | Example value |
|---|---|
| `VITE_API_URL` | `https://api.example.com/api` |
| `VITE_WS_URL` | `wss://api.example.com/api/ws/terminal` |

Do not add `ALLOWED_ORIGINS`, database passwords, SSH keys, Docker credentials, or any AI-provider secret to Vercel. Those belong only on the backend server.

## 4. Deploy the backend on AWS or Oracle

Clone the same repository to the server with SSH. Use your local SSH command; replace the values with your own server username, key location, and server IP:

```bash
chmod 400 ~/Downloads/ssh-key-2026-07-18.key
ssh -i ~/Downloads/ssh-key-2026-07-18.key ubuntu@SERVER_PUBLIC_IP
```

For Amazon Linux, replace `ubuntu` with `ec2-user`. Inside the server SSH session, run:

```bash
sudo mkdir -p /opt/sk-coder
sudo chown $USER:$USER /opt/sk-coder
git clone https://github.com/NEW_ACCOUNT/sk-coder.git /opt/sk-coder
cd /opt/sk-coder
cp .env.example .env
nano .env
```

Add these values to the server `.env` file, replacing the example domains with your real Vercel and custom frontend domains:

```dotenv
BACKEND_PORT=3001
ALLOWED_ORIGINS=https://YOUR_VERCEL_PROJECT.vercel.app,https://code.example.com
```

Install Docker and Docker Compose as described in `ORACLE_DEPLOYMENT.md`, then start the backend and runtime:

```bash
cd /opt/sk-coder
docker compose build runtime
docker compose up -d --build
curl -fsS http://127.0.0.1:3001/api/healthz
```

The backend port remains bound only to `127.0.0.1`, so it is not open directly to the Internet.

## 5. Create the backend API domain

Create an `A` DNS record such as `api.example.com` that points to the AWS or Oracle server public IP. Copy `deploy/sk-coder-api.nginx.conf` to the server, replace `api.example.com` with the real API domain, enable it in Nginx, and obtain HTTPS:

```bash
sudo cp /opt/sk-coder/deploy/sk-coder-api.nginx.conf /etc/nginx/sites-available/sk-coder-api
sudo nano /etc/nginx/sites-available/sk-coder-api
sudo ln -s /etc/nginx/sites-available/sk-coder-api /etc/nginx/sites-enabled/sk-coder-api
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com
```

After HTTPS is ready, test the public backend endpoint:

```bash
curl -fsS https://api.example.com/api/healthz
```

Set the matching Vercel environment variables and redeploy the Vercel project. The frontend will then call the backend API and terminal WebSocket over HTTPS and WSS.

## 6. Test before changing any old server data

First open the Vercel URL and check the normal interface. Then test the backend health route, create a workspace, run one C++, Python, and Java source file, open SK Shell, and confirm Preview. Keep the old AWS deployment untouched until all tests work. Make a backup before deleting anything from the old server.

## 7. Database and backups

No database is required for the present version. Add PostgreSQL only when you add accounts, team workspaces, paid plans, or cross-device project history. Keep any future database internal to the server network and back it up daily outside the server. For the present application, back up the Docker workspace volume before updates or deletion, and keep GitHub as the code backup.
