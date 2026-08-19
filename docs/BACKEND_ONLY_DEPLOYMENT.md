# Backend-Only Deployment Archive

This archive is for the AWS or Oracle server. Extract it into an application folder such as `/opt/sk-coder-backend`. Do not extract it into the folder where you keep `.pem` or `.key` files.

## Included folders

| Path | Purpose |
|---|---|
| `backend/` | API service, terminal WebSocket bridge, workspace manager, and Docker configuration. |
| `runtime/` | Language runtime image definition. |
| `deploy/docker-compose.backend.yml` | Starts the runtime image and backend without the frontend. |
| `deploy/sk-coder-api.nginx.conf` | API-domain reverse proxy example. |
| `deploy/server-config.example` | Safe server configuration template. |

## Server commands

```bash
sudo mkdir -p /opt/sk-coder-backend
sudo chown $USER:$USER /opt/sk-coder-backend
cd /opt/sk-coder-backend
unzip ~/Downloads/sk-coder-backend-deploy.zip
cd sk-coder-backend
cp deploy/server-config.example .env
nano .env
```

Set the Vercel and custom frontend URLs in `.env`:

```dotenv
BACKEND_PORT=3001
ALLOWED_ORIGINS=https://YOUR_PROJECT.vercel.app,https://code.yourdomain.com
```

Start the backend and language runtime after Docker and Docker Compose are installed:

```bash
docker compose -f deploy/docker-compose.backend.yml build runtime
docker compose -f deploy/docker-compose.backend.yml up -d --build
curl -fsS http://127.0.0.1:3001/api/healthz
```

Keep the backend port private. Publish the API through Nginx and HTTPS using `deploy/sk-coder-api.nginx.conf`, then set the matching `VITE_API_URL` and `VITE_WS_URL` values in Vercel.
