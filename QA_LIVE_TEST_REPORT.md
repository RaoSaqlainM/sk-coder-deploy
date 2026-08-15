# Live QA Test Report

## Scope and environment

The live browser test used the repaired SK Coder frontend at the exposed development URL. The test browser had no configured AI key and no deployed Oracle Docker backend. Every backend-dependent outcome below is therefore reported as unavailable rather than represented as a successful local runtime.

## Verified interactive results

| Flow | Test performed | Result |
|---|---|---|
| Files to Editor | Created an isolated `index.html` test file through Files → New File. | Passed. The file opened in the Monaco editor with the generated HTML template. |
| Editor to Preview | Used the editor Preview control for the created HTML file. | Passed. The Preview panel opened its iframe and displayed the `Preview ready` status. |
| Node.js source execution | Submitted `console.log("node-source-qa")`. | Passed. The live runtime returned `node-source-qa`. |
| Python source execution | Submitted `print("python-source-qa")`. | Passed. The live runtime returned clean text `python-source-qa`; no byte-array or Pyodide I/O error occurred. |
| Java source execution | Submitted a minimal `Main` class that prints `java-source-qa`. | Passed. The live compiler/runtime returned `java-source-qa`. |
| Node shell-command routing | Submitted `npm install --ignore-scripts` from the Node.js code tab. | Passed after repair. It now routes to SK Shell and states that an Oracle workspace session is required; it no longer sends the command to Wandbox as JavaScript. |
| Added terminal tabs | Added an additional Node.js terminal from the plus menu and then clicked its close control. | Passed. The added tab appeared and was removed successfully. |
| Preview panel | Opened from bottom navigation and from the editor. | Passed. Mobile, Tablet, Desktop, URL, Refresh, and new-tab controls were visible. |
| SK-AI panel | Opened with no provider configured. | Passed. It accurately required an API key or Puter configuration and did not simulate an AI response. |
| APK panel | Opened through bottom navigation. | Passed as a ZIP/APK inspector interface only. It exposes open/repackage features, but it is not a verified Android build/decompile/signing tool. |
| GitHub panel | Opened through bottom navigation. | Panel opens, but it still requires a client-side personal access token and is not a completed secure GitHub integration. |
| Browser console after repair | Reloaded the frontend after the WebSocket availability gate. | Passed. The fresh browser-console error log contained zero errors. |

## Confirmed repair in this QA cycle

The original failure was reproduced: `npm install` entered in the Node.js code tab was submitted to Wandbox as JavaScript, producing `SyntaxError: Unexpected identifier 'install'`. The terminal now detects package-management and workspace shell commands in language tabs, routes them to SK Shell, and emits an honest message when an Oracle workspace session is not connected.

The live preview also previously attempted a terminal WebSocket connection against the frontend-only Vite host, producing repeated connection errors. Terminal startup now checks the backend health endpoint before creating the WebSocket. In a frontend-only preview it reports that the Oracle workspace is unavailable and continues to use the real public source-code fallbacks.

## Remaining limitations and production work

An `npm install`, `git`, `pip install`, or equivalent workspace command cannot run until the Oracle Docker backend is deployed and reachable. This is correct behavior in the current frontend-only preview; source-code snippets still run through real public execution providers.

The browser-tested GitHub panel remains incomplete and should not be treated as secure or functional for repository operations. The APK panel remains a browser-side archive editor, not a signed Android build service. SK-AI’s provider response and approval card execution require a configured AI provider and should be tested on the deployed backend before making a production-complete claim.
