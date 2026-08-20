# SK Coder Implementation Audit

## Completed in this pass

The terminal no longer creates a fixed 6 MB browser snapshot or base64-encodes binary files before running a shell command. It stages browser-held project files through resumable binary chunks. Staging is cleaned when an isolated workspace closes or expires. Selecting four-hour retention no longer immediately suspends an active workspace.

## Remaining work before production claims

| Area | Current behavior | Required completion |
|---|---|---|
| End-to-end staging test | Backend and frontend TypeScript checks pass, but this sandbox has no Docker daemon. | Deploy the new backend on the test server and run interruption, resume, zero-byte-file, binary-media, and multi-file npm project tests. |
| APK lifecycle | The APK editor keeps an opened archive only in its component state. Closing or reloading the page discards that state. | Store APK source and edits under the browser workspace lifecycle, then stage only when an explicit server operation needs it. |
| APK size behavior | APK loading currently reads the full selected archive with `File.arrayBuffer()`. | Move archive parsing to streamed or worker-based import for large APK/XAPK files and report actual browser capacity. |
| Mobile audit | Viewport and input sizing fixes are present. | Exercise keyboard open/close, file explorer scrolling, terminal scrolling, and desktop-mode mobile browser layouts on physical devices. |
| Language claims | Direct runtime image support is verified only for Node.js, Python, Java, C, C++, Kotlin, Rust, Go, PHP, Ruby, and Bash. | Test each runtime with source input, stdin, multi-file project command, and cleanup; leave other languages in the project-toolchain tier until an isolated image test passes. |

## Test prerequisites

The source and deployment repositories now contain the staged-transfer code. The AWS backend is not yet rebuilt from these commits, and the Vercel project is not yet pointed at the current frontend repository. Public testing must wait until those deployment gaps are closed.

## Required real-server test matrix

| Test | Expected result |
|---|---|
| Empty project and empty source file | The terminal accepts the command and the empty file is present in the workspace. |
| 5 MB binary file | The file transfers in more than one chunk and is available to a shell command. |
| Interrupted upload | Reloading or retrying uses stage status and only retransmits missing chunks. |
| Source edits after a successful stage | The next command restages the changed project; unchanged commands do not upload again. |
| Media file in an HTML project | The browser preview remains local and the workspace copy is available when an explicit build command requires it. |
| Node.js project | `npm install`, `npm run build`, and `npm run dev` execute in the live isolated workspace. |
| Python, Java, C, C++, Kotlin, Rust, Go, PHP, Ruby, Bash | Each direct runtime is tested with source output and standard input. |
| Workspace deletion and expiry | Staging directories, containers, command artifacts, and package cache entries follow the documented cleanup rule. |
