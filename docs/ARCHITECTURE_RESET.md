# SK Coder Architecture Reset

## Purpose

This document replaces the incorrect assumption that a user project should be continuously stored on the backend. The approved model is **browser-first project storage** with **temporary, bounded backend execution**. The backend exists to run terminals, package managers, compilers, preview servers, and language runtimes; it is not the permanent source of truth for user projects.

## Confirmed Problems to Correct

| Area | Observed failure | Required correction |
|---|---|---|
| Project storage | The frontend created a backend project and uploaded workspace state every ten seconds. | Remove automatic backend project creation and recurring project uploads. Use IndexedDB/OPFS as the default source of truth. |
| Workspace lifecycle | File deletion, terminal history, package data, and APK state did not share one retention policy. | Give each browser workspace one lifecycle record and make all temporary backend material follow it. |
| Terminal capacity | Old or scheduled containers could occupy the small active-session cap. | Count actual containers, stop scheduled containers, delete expired sessions, and isolate test sessions. |
| Backend availability | The temporary public tunnel made the API hostname unstable and created confusion after restarts. | Use a permanent `api` custom subdomain, HTTPS reverse proxy, automatic container restart, and server-side health checks. |
| Uploads | Browser limits were presented as if they were backend limits, and a 1 GB promise was not validated against the device. | Stream imports locally, inspect quota, request persistence after user action, and report actual device capacity before import. |
| Runtime claims | The interface implied broad support without a per-language verified runtime contract. | Publish an execution-tier matrix and never claim a compiler is available until its image and test pass. |
| Mobile desktop mode | Keyboard zoom and scrolling differ from mobile mode. | Add a focused viewport, keyboard, focus, scroll, and desktop-mode regression test; preserve the existing approved layout. |

## Permanent Data Model

```text
Browser IndexedDB / OPFS
  └─ Primary project files, folders, editor state, media metadata, local change history

Temporary terminal workspace on Oracle
  └─ A time-limited synchronized copy used only by SK Shell, npm, builds, and project commands

Disposable runner workspace on Oracle
  └─ A short-lived execution snapshot for Run / Compile / Preview; always removed after result expiry

Result metadata in browser
  └─ Run result, selected file binding, console history, and preview settings
```

The backend cannot read IndexedDB directly. When a user opens SK Shell or runs a program, the browser sends the needed project snapshot over HTTPS/WebSocket to an isolated workspace. Terminal edits and generated source changes are returned as a bounded file diff and written back to browser storage. This ensures that a backend outage does not erase the project.

## Storage Map

Oracle documents a combined Always Free block-volume allowance of 200 GB, shared by boot and attached volumes. The user's real usable amount must be measured from the final instance with `df -h`; the AWS test machine is only about 28 GB and must not be used as the capacity model.

| Capacity lane | 150 GB operational target | 200 GB Always Free target | Retention | Purpose |
|---|---:|---:|---|---|
| Operating system, Docker engine, runtime images | 25 GB | 30 GB | Persistent | Ubuntu, Docker, language images, backend binaries. |
| Protected free-space reserve | 30 GB | 40 GB | Never allocated | Protects the server from disk exhaustion; no user data is admitted into this lane. |
| Terminal workspace pool | 30 GB | 40 GB | Up to 72 hours | Temporary synchronized copies for real shells, npm, package locks, and project builds. |
| Disposable runner scratch pool | 20 GB | 30 GB | Minutes | Compilers, standard input/output, build artifacts, previews, and tests. Deleted after run or result expiry. |
| Controlled package cache | 10 GB | 15 GB | Least-recently-used | Capped npm/pip/Gradle/Maven cache. It is not user project storage. |
| Logs and diagnostics | 5 GB | 5 GB | Rotated | Health logs, terminal audit metadata, and error diagnostics. |
| Upgrade, rollback, and emergency headroom | 30 GB | 40 GB | Reserved | Image upgrades, recovery, backups, and unexpected growth. |

The server should begin refusing new long-lived terminal workspaces before the protected reserve is touched. Source projects are already in the browser, so they do not need to be moved at that moment. A single-file compatible runner can still be offered when safe scratch capacity exists; a real multi-file shell cannot be honestly replaced by a public compiler service.

## Large File and 1 GB Import Policy

SK Coder may offer a **1 GB import target**, but it cannot honestly guarantee that every phone or browser has 1 GB available. Browser storage quotas vary by device, browser, free disk space, private-browsing mode, and user permission. The importer must:

1. Read archives and files in chunks rather than convert entire imports to strings in memory.
2. Estimate available browser quota before starting and show the expected project size.
3. Request persistent browser storage only after the user explicitly imports or saves meaningful work.
4. Store source and binary blobs in IndexedDB/OPFS, not localStorage.
5. Stop safely and offer a download/export route when the device cannot reserve enough storage.
6. Never silently upload an entire 1 GB project to the server merely because browser storage is constrained.

## Workspace and Deletion Rules

| User action | Browser project | Terminal copy | Runner copy | History and APK state |
|---|---|---|---|---|
| Normal editing | Kept locally | Not created | Not created | Kept locally |
| Open terminal | Kept locally | Created or reused within 72-hour allowance | Not created | Terminal state bound to same workspace ID |
| Run a file | Kept locally | Optional only when project build needs it | Created, result collected, then removed | Result metadata bound to selected file |
| Leave tab and choose Keep | Kept locally | Retained for up to 72 hours | Removed | Terminal history and APK session follow the same retention record |
| Leave tab and choose Delete | Kept locally until user explicitly clears browser data | Stopped immediately; deleted after one-hour undo window | Removed | Terminal history and APK temporary data deleted with the server workspace |
| Server reaches reserve | Kept locally | New terminal session waits or is refused safely | Single-file fallback only when supported | No project data is deleted |

## Custom Domain and Permanent Hosting

The temporary tunnel is suitable only for testing. Production requires two HTTPS hostnames:

| Hostname | Destination | Purpose |
|---|---|---|
| `app.example.com` or apex domain | Vercel frontend | Static SK Coder user interface. |
| `api.example.com` | Oracle public IPv4 → Nginx → local backend container | API, terminal WebSocket, runners, and lifecycle routes. |

Hostinger manages the DNS records. An A record should point `api` to the Oracle public IP. Vercel provides its own domain-verification records for the frontend hostname. Oracle networking and the host firewall must permit HTTP and HTTPS only, plus restricted SSH. Nginx terminates TLS with automated certificate renewal and proxies API/WebSocket traffic to the Docker backend. Docker Compose or systemd must restart the backend after reboot; it must never depend on an open SSH window.

## What “IndexedDB” Means

IndexedDB is a database inside the user's browser for large structured data and blobs. It is not a cloud database and it is not shared automatically between devices. Clearing site data or changing browser/device can remove access to it. The app must provide download/export and optional future sign-in/cloud-sync choices, but no-login local operation remains the default.

The name “VertoDB” is not a standard browser or hosting storage technology. It is not part of this design. The relevant browser technologies are IndexedDB and Origin Private File System (OPFS).

## Initial Language Support Contract

| Tier | Meaning | Examples |
|---|---|---|
| Direct server runtime | Installed in the maintained runtime image and tested with source execution. | Node.js, Python, Java, C, C++, Kotlin, Rust, Go, PHP, Ruby, Bash. |
| Project-toolchain runtime | Needs a dedicated image or toolchain test; not enabled until tested. | C#, F#, VB.NET, Scala, Groovy, Clojure, Dart, Swift, Perl, Lua, Haskell, Elixir, Erlang, OCaml, Nim, D, Zig, V, Ada, Fortran, COBOL, Pascal, Prolog, R, Julia, Octave. |
| Build/preview workflow | Requires a project build command, browser preview, or validation rather than a single-file compiler. | HTML, CSS, Sass, Less, React, Vue, Svelte, Astro, SVG, Markdown, JSON, YAML, XML, Terraform, Dockerfile. |
| Not safe or not available on the free Linux runner | Requires proprietary software, macOS/Xcode, a mobile emulator, an external database, or resources beyond the instance. | Native iOS app builds, Android emulator/APK assembly, MATLAB, SAS, Stata, Unreal projects, arbitrary Docker builds. |

## Security Rule

Tokens shared in chat are treated as exposed. They must be revoked and recreated before they are used. The new secrets must be held only in secured server configuration and never embedded in frontend code, Git history, screenshots, or documents.

## Revised Server-First Continuation Rule

The server first attempts to create a retained project workspace from the bounded terminal workspace pool. When the pool has sufficient quota, newly created and imported files are staged there and ordinary SK Shell commands use that workspace directly. The browser keeps a local manifest and device copy so refresh, temporary disconnects, and cloud cleanup do not destroy the user project.

When the server project-storage pool reaches its configured threshold, new project files remain in browser IndexedDB or OPFS and the project is marked browser-resident. Terminal and runner requests then create a temporary staging session only when required and copy the browser manifest through resumable chunks. The server removes staging files, generated artifacts, and command logs on the lifecycle deadline. The browser remains the source of truth unless the user explicitly elects to retain the server workspace.

| Stage | Browser responsibility | Server responsibility |
|---|---|---|
| Start | Sends a manifest with path, byte size, hash, and revision. | Returns a staging session ID and the missing file ranges. |
| Transfer | Sends 4 MiB binary chunks from `Blob.slice()` or a stream. | Writes chunks to a temporary staging path and records completed offsets. |
| Resume | Requests the existing session after a network interruption. | Returns completed ranges so only missing chunks are resent. |
| Verify | Sends final file hash and project revision. | Promotes complete files atomically into the isolated terminal or runner workspace. |
| Cleanup | Retains the local project and manifest. | Removes staging data, runner outputs, logs, and expired caches. |

The client must never base64-encode a full large file. It sends binary chunks, reports progress, and obeys actual device and server capacity. A capacity rejection never deletes browser-resident project data.

## Non-Arbitrary Capacity Rule

SK Coder must not impose a product-defined 4 MB, 6 MB, 100 MB, or equivalent per-file or whole-project ceiling on an otherwise viable user workspace. The only valid constraints are measured browser-origin capacity, measured project-workspace capacity, temporary runner scratch capacity, transfer timeouts, and the verified limits of an external fallback provider.

Server project capacity and execution capacity are separate lanes. When the retained project lane is full, the app continues to keep project files in browser storage and stages them to a temporary terminal or runner workspace when actual runtime capacity is available. A full retained-project lane must not by itself claim that every terminal and runner feature is unavailable.

Browser workspace data is retained for the selected three-day lifecycle unless the user explicitly schedules deletion or clears site data. A deletion request uses a separate undoable schedule. Retention details belong in workspace management UI and documentation, not in terminal connection output.
