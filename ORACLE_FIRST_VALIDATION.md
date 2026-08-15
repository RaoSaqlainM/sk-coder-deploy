# Oracle-First Runtime Validation

## Verified results

| Area | Result | Evidence |
|---|---|---|
| Frontend compilation | Passed. | TypeScript check and Vite production build completed after the migration. |
| Backend compilation | Passed. | API TypeScript check and esbuild production bundle completed after the migration. |
| Oracle runtime contract | Passed. | `GET /api/execute/runtimes` reports Node.js, TypeScript, Python, Java, C, C++, Kotlin, Rust, Go, PHP, Ruby, and Bash with `oracle-workspace` as their tier. |
| Docker absence behavior | Passed. | In this sandbox, session creation returned HTTP 503 with `The isolated runtime service is not available.` rather than claiming that commands ran. |
| Piston availability | Disabled as a public fallback. | A live request returned HTTP 401 and stated that public access is whitelist-only. |
| Wandbox fallback | Passed. | A live Node.js request returned HTTP 200 and expected stdout. |
| Live UI fallback disclosure | Passed. | A Node.js program showed `Runtime: wandbox-source` and stated that packages, project files, shell commands, and persistence require Oracle. |
| Browser console | Passed. | Fresh frontend console check returned zero errors. |

## Architecture result

The Oracle Docker workspace is the primary tier in the backend API and the frontend execution chain. It is the only tier that is allowed to claim SK Shell commands, package installation, workspace files, multi-file projects, and persistent session storage. The public fallback is Wandbox for supported single-source programs. Pyodide remains the last fallback for Python source only. Piston is not queried by the active execution chain because the public endpoint is no longer available without authorization.

## Required Oracle-host acceptance test

Docker is not available in this validation environment, so the following must be tested on the Oracle host after `docker compose up -d`: create a session, sync a multi-file project, run `npm install`, run `npm run build`, execute a TypeScript file, import NumPy in Python, compile Kotlin, run PHP and Ruby, reconnect the WebSocket terminal, and confirm 72-hour cleanup plus workspace-size enforcement. The implementation is compiled and the no-Docker behavior is honest, but these Docker-dependent flows cannot be represented as tested until that host acceptance run occurs.

## References

[1]: https://piston.readthedocs.io/en/latest/api-v2/ "Piston API v2 documentation"
[2]: https://wandbox.org/ "Wandbox compiler service"
[3]: https://ce.judge0.com/ "Judge0 CE API documentation"
