# SK Coder Oracle Deployment Guide

## Purpose

This deployment starts the supplied SK Coder frontend, API service, and language-runtime image on one Oracle compute instance. The browser application is served through the `frontend` container. Requests under `/api/` and the persistent terminal WebSocket route are reverse-proxied to the API container. The API service creates isolated Docker workspace sessions that use the supplied runtime image.

> The API container receives the Docker socket so it can create and remove runtime containers. Treat the host and Docker administrators as trusted operators, and do not expose the Docker socket over the network.

| Service | Host exposure | Responsibility |
|---|---:|---|
| `frontend` | `${HTTP_PORT:-8080}` | Serves the built React application and proxies API and terminal WebSocket traffic. |
| `backend` | Internal only | Creates isolated workspace sessions, executes commands, and bridges terminal WebSocket traffic. |
| `runtime` | Internal only | Builds the reusable Node, Python, Java, Rust, Go, GCC, and Git execution image. |
| `workspace-data` | Docker-managed volume | Holds server-side workspace session data until expiry or cleanup. |

## Prerequisites

Use a current 64-bit Linux host with Docker Engine and the Docker Compose plugin. The Docker documentation supports Ubuntu 24.04 LTS and arm64 as well as amd64, and its official install path includes `docker-compose-plugin`. [1] The Compose plugin documentation recommends verifying the installation with `docker compose version`. [2]

For an Ubuntu-based Oracle VM, follow Docker's official engine installation instructions rather than using a convenience script for a production host. After installation, verify the daemon and Compose plugin:

```bash
docker version
docker compose version
sudo docker run hello-world
```

OCI and Docker both require host firewall and cloud-network ingress rules to be considered. Exposed container ports can bypass uncomplicated host firewall assumptions, so place public TLS termination in front of SK Coder and restrict the direct application port as appropriate. [1]

| Required ingress | Recommended source | Reason |
|---|---|---|
| TCP 80 | Public | HTTP challenge and redirect to HTTPS. |
| TCP 443 | Public | TLS traffic for the custom domain. |
| TCP 22 | Administrator IP range only | SSH administration. |
| TCP 8080 | Private reverse proxy or administrator IP range | Optional direct troubleshooting only; do not leave publicly open when a reverse proxy is used. |

## Host preparation

Clone the private repository to the Oracle instance, create the production environment file, and choose the server-side storage ceiling. The default aggregate workspace ceiling is **75 GiB** and each session is capped at **5 GiB**. A 25 GiB safety reserve protects the host before new workspace admission is allowed. Runtime images, package cache, and logs are bounded separately so the 150 GB host disk is not allocated entirely to user workspaces.

```bash
git clone https://github.com/RaoSaqlainM/sk-code-main.git
cd sk-code-main
cp .env.example .env
```

Edit `.env` to set the actual capacity policy. Values are bytes except for duration and session count.

```dotenv
RUNTIME_IMAGE=sk-coder-runtime:latest
SESSION_TTL_HOURS=72
SESSION_MAX_BYTES=5368709120
WORKSPACE_MAX_BYTES=80530636800
WORKSPACE_SAFETY_RESERVE_BYTES=26843545600
PACKAGE_CACHE_MAX_BYTES=21474836480
LOG_MAX_BYTES=5368709120
SESSION_MAX_COUNT=50
COMMAND_TIMEOUT_MS=120000
LOG_LEVEL=info
HTTP_PORT=8080
```

| Variable | Default | Operational meaning |
|---|---:|---|
| `SESSION_TTL_HOURS` | `72` | Default three-day retention for a workspace unless the user selects the four-hour deletion flow. |
| `SESSION_MAX_BYTES` | `5368709120` | Limits a single server-side workspace to 5 GiB. |
| `WORKSPACE_MAX_BYTES` | `80530636800` | Stops new server-side workspace allocation at 75 GiB. |
| `WORKSPACE_SAFETY_RESERVE_BYTES` | `26843545600` | Rejects new allocation when the host would fall below 25 GiB free. |
| `PACKAGE_CACHE_MAX_BYTES` | `21474836480` | Reserves at most 20 GiB for package and dependency cache. |
| `LOG_MAX_BYTES` | `5368709120` | Reserves at most 5 GiB for service and runtime logs. |
| `SESSION_MAX_COUNT` | `50` | Limits concurrent/retained managed sessions. |
| `COMMAND_TIMEOUT_MS` | `120000` | Limits one REST command execution to two minutes. |

The frontend's IndexedDB persistence is a browser-side resilience path for workspace content. It is not a replacement for the server-side workspace when the browser must run commands or retain packages.

## Build and start

Build the supplied runtime image and start the application stack:

```bash
docker compose build runtime
docker compose up -d --build
docker compose ps
```

Inspect startup logs if any service is unhealthy:

```bash
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
```

Verify the internal health route from the host after the stack is running:

```bash
curl -fsS http://127.0.0.1:8080/api/healthz
```

The expected response is a JSON object with `status` set to `ok`.

## Custom domain and TLS

Point the custom domain's DNS record to the Oracle instance public IP. Run Caddy or Nginx on the host as the public TLS endpoint, then proxy to `127.0.0.1:8080`. Ensure WebSocket upgrade headers are preserved for `/api/ws/terminal`.

Example Nginx server block:

```nginx
server {
    listen 80;
    server_name code.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Obtain and renew TLS certificates using the reverse proxy's supported ACME workflow. After DNS and TLS are configured, validate the public endpoint:

```bash
curl -fsS https://code.example.com/api/healthz
```

## Runtime behavior and resilience

Server-side Docker sessions are the preferred execution route. The frontend falls back to live public providers only when the backend is unavailable or rejects a request: Wandbox is the source-only public fallback and Python may use Pyodide as a final browser-side offline fallback. Piston is intentionally disabled because its public endpoint is not a dependable anonymous execution service. The application reports the actual result source rather than labelling fallback output as server execution.

The workspace registry is stored in `WORKSPACE_METADATA_PATH` and survives a backend restart. The backend reconciles managed Docker containers on startup, records heartbeats, and respects the user's selected lifecycle: retain for three days, or schedule deletion after four hours with a cancellation option before deletion. Do not delete the metadata file or the workspace volume during routine restarts.

SK-AI can propose file writes, folder creation, deletion, terminal commands, and Preview navigation. It does not apply a parsed action automatically. The user must explicitly choose **Approve** on each proposed action; **Decline** removes it without modifying the workspace.

## Operations and recovery

Use the following commands for routine operations:

```bash
docker compose ps
docker compose logs -f backend
docker compose restart backend
docker compose up -d --build
```

The volume is named `workspace-data` by the Compose project. Inspect its location and volume metadata using Docker rather than deleting it blindly:

```bash
docker volume ls
docker volume inspect sk-code-main_workspace-data
```

Deleting the workspace-data volume permanently destroys server-side session data. Before an intentional destructive maintenance action, stop the stack and make a host-level backup of the volume data.

## References

[1]: https://docs.docker.com/engine/install/ubuntu/ "Docker: Install Docker Engine on Ubuntu"
[2]: https://docs.docker.com/compose/install/linux/ "Docker: Install the Docker Compose plugin"
