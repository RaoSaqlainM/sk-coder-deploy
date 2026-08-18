# Implementation Research Notes

## GitHub access

GitHub recommends fine-grained personal access tokens where possible. They can be limited to one owner, selected repositories, and the minimum permissions required. Repository contents access is sufficient for read or write repository actions; Codespaces actions require the relevant Codespaces repository permission. Fine-grained token support does not cover every API feature, so the application must validate selected actions and explain errors instead of requesting broad access by default.

For a project created in GitHub Codespaces, the workspace token is normally scoped to the source repository. Additional repository permissions are requested through `devcontainer.json` during codespace creation, and users must review them. The application should not present a token as equivalent to GitHub Copilot, nor expose a token to browser JavaScript.

Sources: GitHub personal access token management, REST authentication, and Codespaces repository-access documentation retrieved on 2026-08-18.

## Browser terminals and interactive programs

xterm.js documents that terminal input is delivered through its input and data events and that browser-to-PTY WebSocket terminals need an explicit message protocol for interactive input, resize, output, and flow control. Output must be bounded and acknowledged to avoid unresponsive clients or dropped data under fast output. A mobile keyboard accessory may send standard control sequences, but it must not pretend to emulate unsupported system behavior.

For source-only public execution, interactive standard input can only be supported where the provider accepts predefined stdin before a run. A program waiting after execution starts needs a real Oracle PTY session. The user interface must label those two models differently.

Sources: xterm.js Terminal API and Flow Control guide retrieved on 2026-08-18.

## Source fallback input

The Wandbox public interface exposes a Stdin field alongside its source-run controls. The fallback can therefore accept fixed input provided before a compatible single-source run begins, but it is not an interactive terminal session. The IDE must call this `Input before run` and reserve prompt-by-prompt input, cancellation, and real-time output for Oracle-backed processes.

Source: Wandbox public interface retrieved on 2026-08-18.
