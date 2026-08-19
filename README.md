# SK Coder

SK Coder is a browser-based coding workspace with a React frontend, a Node.js backend, isolated Docker runtime sessions, file Preview, Result Center, and approval-gated AI workspace actions.

## Repository layout

| Path | Purpose |
|---|---|
| `frontend/` | React and Vite application served to users. |
| `backend/` | Express API, terminal WebSocket bridge, workspace registry, and runtime session manager. |
| `runtime/` | Docker image definition for isolated language workspaces. |
| `deploy/` | Nginx and systemd files for a custom-domain Oracle deployment. |
| `docs/ORACLE_DEPLOYMENT.md` | Plain-language installation and operations guide. |
| `docker-compose.yml` | Production service stack for frontend, backend, runtime image, and durable workspace volume. |

## Local development

Install dependencies separately for each service, then run them in two terminals:

```bash
cd frontend
pnpm install
pnpm run dev
```

```bash
cd backend
pnpm install
pnpm run dev
```

The frontend development server proxies `/api` and terminal WebSocket requests to `http://127.0.0.1:3003` by default. Set `VITE_API_PROXY_TARGET` only when the backend runs on a different local address.

## Production

Copy `.env.example` to `.env`, choose storage limits that fit the server, and start the complete stack with Docker Compose:

```bash
cp .env.example .env
docker compose up -d --build
```

For a custom domain, follow [`docs/ORACLE_DEPLOYMENT.md`](docs/ORACLE_DEPLOYMENT.md). It covers server preparation, domain DNS, TLS, service startup, health checks, storage, and updates.

## Data and database

The current application does not require a relational database for its core workflow. Browser project state uses local browser storage, while the backend stores workspace lifecycle metadata with the Docker workspace volume. Add a managed database only when a future feature requires shared accounts, billing, team workspaces, or cross-device project history.
