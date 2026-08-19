# Deployment TODO

- [ ] Locate the supplied AWS SSH key and confirm the server address, login user, and host identity without changing the server.
- [ ] Audit the AWS server operating system, disk capacity, Docker availability, running services, deployed files, and current data without deletion.
- [ ] Test the cleaned SK Coder frontend and backend in an isolated staging location before replacing any existing deployment.
- [ ] Prepare a backup and inventory of the old deployment, then request explicit approval before deleting any existing server data.
- [ ] Prepare Oracle server deployment and custom-domain cutover steps after the AWS test succeeds.
- [ ] Transfer or mirror the cleaned repository to the user’s separate GitHub account without committing SSH keys, environment files, user workspaces, or backups.
- [ ] Configure a Vercel project that builds only the frontend and connects to the external backend through a public HTTPS API endpoint.
- [ ] Configure the AWS or Oracle backend domain, CORS policy, WebSocket endpoint, Docker stack, and health check before connecting Vercel.
- [ ] Keep all private SSH keys exclusively on the user’s computer and use them only through a local terminal for server login.
- [x] Update every frontend API request to honor the configured external backend URL so a Vercel-hosted frontend can use AWS or Oracle without same-origin request failures.
- [x] Audit the deployable source for public-release safety before creating a new public GitHub repository.
- [x] Create a backend-only archive containing deployment source and configuration but excluding all keys, environment files, runtime data, build output, dependencies, and backups.
- [x] Create and publish a new public GitHub repository with a clear deployment-ready name after the release-safety audit passes.
- [x] Provide a backup-first AWS cleanup procedure and request explicit server-specific confirmation before any destructive delete command is used.
