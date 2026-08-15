# SK Coder Repair TODO

- [x] Diagnose and fix Node.js tab routing of shell commands such as `npm install` and `run` into the JavaScript code runner.
- [x] Prevent the terminal from opening a failing WebSocket against a frontend-only preview host when the Oracle backend is unavailable.
- [x] Test every terminal mode for correct distinction between source-code execution and persistent shell commands.
- [x] Test all visible application panels and primary flows, including Files, Editor, Terminal, Preview, SK-AI, APK, and GitHub.
- [x] Document only verified working behavior, partial features, disabled behavior, and confirmed defects.
- [x] Re-run frontend and backend validation after confirmed repairs.
- [ ] Make the Oracle isolated runtime the explicit primary backend for SK Shell and all supported language execution.
- [x] Replace the legacy editor runner that currently tries Wandbox before the backend for Node.js and Java.
- [x] Add Oracle primary runtime coverage for TypeScript, Kotlin, PHP, Ruby, and NumPy-enabled Python execution.
- [x] Build a per-language, publicly documented fallback matrix that runs source code only and never claims shell, package, or project support it cannot provide.
- [x] Expand runtime capability and provider-status reporting so the UI distinguishes primary backend, public fallback, browser-only Python fallback, and unavailable functionality.
- [ ] Verify supported languages and project workflows with real requests, documenting limits for packages, multi-file projects, and long-running processes.
