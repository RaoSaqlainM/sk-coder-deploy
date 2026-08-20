# Render Deployment Assessment

## Decision

Render can host the public SK Coder API surface as a Docker web service with HTTPS, custom domains, and WebSocket connections. It is not approved as the primary isolated workspace-runtime host until a real deployment proves that the service can create and safely manage the required per-workspace execution containers.

## Verified Platform Characteristics

| Capability | Assessment for SK Coder |
|---|---|
| Docker image deployment | Supported for the API service. |
| Public HTTPS and custom domains | Supported for the API and terminal WebSocket endpoint. |
| WebSocket endpoint | Supported when the service binds its HTTP and WebSocket server to the Render `PORT` on `0.0.0.0`. The public client must use `wss`. |
| Persistent disk | Requires a paid service. It is mounted at one path, can be attached to only one service instance, and prevents zero-downtime deploys. |
| Diskless deployment | Not suitable for retained workspace files because the service filesystem is ephemeral. |
| Multi-instance scaling with local workspaces | Not suitable with a persistent disk because the disk is single-instance. |
| Isolated runtime containers | Not verified. The current SK Coder runtime starts disposable Docker containers. Do not claim Render can replace the Oracle or AWS host for this function until it is proven under the selected Render service configuration. |

## Safe Role

Render may be used as an optional public API and WebSocket entry point after a deployment proof confirms health checks, CORS, WebSocket reconnects, persistent staging storage, and runtime isolation. The current primary design remains an Oracle or AWS virtual machine with Docker because it is already designed to own the isolated runner lifecycle and workspace mount.

## Required Proof Before Selection

1. Deploy the backend image and bind the API to `PORT` on `0.0.0.0`.
2. Mount a paid persistent disk at the configured workspace data path.
3. Verify a WebSocket terminal session using `wss` from the deployed frontend.
4. Verify resumable staging, cleanup, and session recovery during a redeploy.
5. Verify whether the service can start the existing disposable runtime containers without privileged host Docker access. If not, keep execution on Oracle or AWS and use Render only as an API gateway or do not use it.

## References

- [Render Web Services](https://render.com/docs/web-services)
- [Render Persistent Disks](https://render.com/docs/disks)
- [Render WebSockets](https://render.com/docs/websocket)
- [Render Docker Deployments](https://render.com/docs/docker)
