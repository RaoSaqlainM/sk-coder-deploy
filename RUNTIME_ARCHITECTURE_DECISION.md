# Runtime Architecture Decision

## Decision

SK Coder will use the Oracle Docker runtime as the only primary environment for the SK Shell, package managers, project dependencies, multi-file builds, file-system commands, long-lived workspace state, and all supported language execution. Browser code will request the Oracle API first. It will use an external source-code provider only when the Oracle backend is unavailable, and it will present the provider and its limitations in the result.

## Provider boundaries

| Layer | Supported purpose | Not permitted to claim | Current use |
|---|---|---|---|
| Oracle isolated workspace | Shell commands, package installation, multi-file projects, workspace files, compiler execution, persistent session state until expiry. | Permanent storage, execution outside Docker limits, or anonymous shared access. | Primary for every executable language and SK Shell. |
| Wandbox | Stateless single-source compilation and execution for the compilers returned by its live catalog. | Shell sessions, `npm install`, `pip install`, project dependency installation, workspace persistence, or arbitrary file uploads. | Public source-code fallback. |
| Piston | Self-hosted or explicitly authorized Piston instance can execute code according to its runtime API. | A free unauthenticated public service. | Disabled as a public fallback; reserve for an Oracle-hosted or authorized instance. |
| Pyodide | Browser-only Python source fallback. | `pip`, OS shell commands, project environments, or durable workspace state. | Last fallback for Python source only. |
| Judge0 | Optional future server-side adapter when an authenticated or self-hosted endpoint is configured. | An assumed free public endpoint or a terminal session. | Not enabled by default. |

## Research findings

The Piston runtime API documents code execution, file input, and resource limits, but a live request to the former public endpoint returned HTTP 401 on this review, stating that public access is whitelist-only. Therefore, Piston cannot be treated as a public fallback unless the owner provides authorization or self-hosts it.[1]

Wandbox’s public interface lists many language families. A live Node.js source request to its compile endpoint returned HTTP 200 and the expected output. Its model is still an individual compile/run submission, not an isolated user workspace or package-management shell.[2]

Judge0 documents sandboxed compilation with resource controls and supports multi-file submissions, but its hosted service may require authentication and its documentation points to plans or self-hosting. It remains an optional configured adapter, not a dependency of the default free fallback path.[3]

## Required UI truthfulness

Every execution response must include its execution tier: `oracle-workspace`, `wandbox-source`, `pyodide-browser`, `piston-authorized`, or `unavailable`. The interface must show a capability message before or with every fallback result. Package commands, dependency installation, terminal sessions, and multi-file project builds must stop with a clear Oracle-runtime requirement when no Oracle session is available.

## References

[1]: https://piston.readthedocs.io/en/latest/api-v2/ "Piston API v2 documentation"
[2]: https://wandbox.org/ "Wandbox compiler service"
[3]: https://ce.judge0.com/ "Judge0 CE API documentation"
