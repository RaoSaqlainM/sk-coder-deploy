# SK Coder Repair Validation Record

## Scope

This record captures the final verification performed against the repaired repository before delivery. It distinguishes verified behavior from Oracle-host behavior that cannot be executed in the sandbox because Docker is unavailable there.

| Area | Verification | Result |
|---|---|---|
| Frontend type safety | `tsc -p tsconfig.json --noEmit` | Passed with zero TypeScript errors. |
| Frontend release build | Vite build using `BASE_PATH=/` | Passed; output bundle generated successfully. |
| Storage quota resilience | Store persists shell state separately from file content with localStorage-to-IndexedDB fallback. | Implemented and build-validated. |
| Panel navigation | Preview and APK panels were opened in a browser smoke check during the repair. | Passed without the former storage crash. |
| Preview bridge | Preview builder error bridge corrected. | Implemented and build-validated. |
| Node.js execution | Live Wandbox fallback executed a Node program. | Passed with exit code 0. |
| Python execution | Live Wandbox fallback executed a Python program. | Passed with exit code 0. |
| Java execution | Live Wandbox fallback executed a Java program. | Passed with exit code 0. |
| Backend type safety | API server typecheck and bundle build. | Passed. |
| Backend health endpoint | Started API server and requested `/api/healthz`. | Passed with `status: ok`. |
| No-Docker behavior | Requested a workspace session where Docker was unavailable. | Returned an honest 503 instead of simulated execution. |
| SK-AI action gate | Parser, proposal UI, approve/decline state flow, and workspace mutation mapping. | Typecheck and release build passed. |
| Durable workspace registry | Workspace lifecycle records persist in the configured metadata JSON file and are restored during backend startup. | Implemented and typecheck-validated. |
| Capacity admission | Session manager reserves 25 GB of host storage and enforces a 75 GB aggregate workspace budget before container creation. | Implemented and typecheck-validated. |
| Workspace lifecycle API | Lifecycle lookup, heartbeat, retention selection, scheduled deletion, and deletion cancellation routes are available. | Implemented and typecheck-validated. |
| Runtime capability API | `/api/execute/runtimes` advertises 12 installed language families and accurately reports Docker availability. | Live endpoint verified; Docker reported unavailable in this sandbox. |
| Connected development proxy | A Vite `/api` proxy forwarded health and runtime-registry requests to the API server. | Live request verified. |
| Unified result metadata | Active-file execution sends tier, capability, and elapsed-time metadata to the Result & Preview center. | Frontend typecheck and release build passed. |
| Capability-aware file actions | The C++ file action menu exposed Run File while retaining normal editor, terminal, file-management, download, and delete actions. | Live browser verified. |
| Pre-run standard input | The Console offered an Input before run card with a multiline field and re-run control for supported source execution. | Live browser verified. |
| Responsive terminal controls | At a 390 × 844 viewport, SK Shell exposed Tab, arrow, Escape, and Ctrl+C controls above the command field. | Live browser verified. |
| Terminal labels | Legacy persisted terminal state is normalized so the visible default tabs are SK Shell and AI Terminal. | Live browser and typecheck verified. |
| Runtime disclosure | A C++ execution used the live `wandbox-source` fallback and stated that package, shell, project-file, and persistence behavior requires Oracle. | Live browser verified. |
| SK-AI availability state | The AI panel displayed current-file context and disabled sending until an API key or the optional provider is configured. | Live browser verified. |
| Result Center refinement | C++ output displayed the active file, completed status, optional Program input control, Interactive terminal route, and plain-language Run details. | Live browser verified. |
| User-focused terminal language | SK Shell now describes a live workspace and honest availability state without exposing hosting or deployment names. Legacy persisted text is normalized on reload. | Live browser and typecheck verified. |
| Responsive Result Center | At a 390 × 844 viewport, Result status, Program input, and Interactive terminal actions fit above the unchanged seven-tab navigation. | Live browser verified. |
| Simplified folder actions | Premature Build Project and Run Project menu actions were removed; folders retain the requested Terminal and GitHub workspace entry points. | Typecheck verified. |
| Public Help and policies | Help, Privacy, and Terms pages use user-facing language, explain supported result paths, and include separate new-tab public footer links. | Live browser and typecheck verified. |
| AI privacy boundary | The user-key assistant prompt is limited to supplied user-workspace context, requires approved action proposals, and forbids disclosure of private product implementation. | Typecheck verified. |

## Verification details

The frontend production build completed with 1,755 transformed modules. The build emitted two non-blocking optimization warnings: a JSZip import cannot be split because it is also statically imported elsewhere, and the resulting main JavaScript chunk is above Vite's 500 kB advisory threshold. These warnings do not prevent deployment or execution, but they identify a future optimization opportunity to code-split non-critical IDE panels.

The connected browser completed a final responsive visual smoke check. At a 390 × 844 viewport, the terminal keyboard row and all seven bottom-navigation destinations remained reachable. The source-file menu exposed only the applicable run affordance; C++ execution opened the shared Console, exposed the pre-run input control, and the Runtime tab truthfully disclosed the active public fallback. The AI workspace remained visible with active-file context and an explicit configuration-required state rather than a fabricated response.

The safe-upgrade browser check re-ran the C++ flow after the Result Center revision. The Console identified `probe.cpp`, showed a completed state, kept Program input collapsed until requested, and offered an explicit Interactive terminal route. The compact mobile layout retained both actions without covering the seven-tab navigation. The public Help and Privacy pages rendered independently of the IDE and used task-focused language with professional footer links. The frontend release build and backend typecheck and bundle build passed; Vite reported only its existing non-blocking JSZip and bundle-size optimization warnings.

## Large-project lifecycle behavior

Workspace lifecycle metadata is durable independently of browser storage. A new workspace is retained for three days by default. The user can select a four-hour deletion window, confirm the destructive choice, and cancel the scheduled deletion before expiry. A heartbeat extends the active workspace expiry without changing the chosen retention mode. The server labels managed containers and restores known workspace records after a backend restart so cleanup decisions do not depend on a browser tab remaining open.

The browser remains a local source mirror only. It does not replace the Oracle runtime or provide a fake command shell. The one full command terminal is **SK Shell** and requires an available Oracle Docker workspace. Python Run, Node Run, and Java Run are source-execution controls; their outputs disclose the execution tier and capability in the shared Result & Preview center. When an Oracle workspace cannot be created, the system uses only compatible source-only providers and explicitly states their limitations.

## Items requiring Oracle-host validation

The Docker-based session backend cannot be fully end-to-end tested in this sandbox because its Docker daemon is intentionally unavailable. After deployment, verify the following on the Oracle instance:

| Test | Expected behavior |
|---|---|
| Create a workspace session | The API starts an isolated container using `sk-coder-runtime:latest`. |
| Run `node -v`, `python3 --version`, and `java -version` in SK Shell | The persistent terminal bridge returns real container output. |
| Upload a project and install a package | Workspace bytes count toward the configured per-session and global limits. |
| Wait past the configured TTL or trigger cleanup | Expired session containers and workspace data are removed. |
| Disconnect backend temporarily | The UI reports provider status and uses the live public fallback chain rather than fake browser execution. |
| Send SK-AI a valid `<sk-actions>` response | Proposal cards appear; declining makes no changes, while approval executes only the chosen action. |
| Select Delete in 4h and confirm | The lifecycle endpoint records the pending deletion, the UI displays the countdown, and Cancel deletion restores the selected retention mode. |
| Restart the API service with existing metadata | Lifecycle records are restored and active Docker containers are reconciled without deleting active workspaces. |
| Fill host storage close to the reserve threshold | New workspace admission is rejected before the 25 GB safety reserve is consumed. |

## Delivery conclusion

The repository is release-buildable, has verified public execution fallback behavior for Node.js, Python, Java, and C++, and contains the Oracle deployment artifacts and host runbook required for deployment. The durable lifecycle registry, capacity admission controls, capability-aware actions, mobile terminal controls, pre-run standard input, runtime disclosure, unified result metadata, and approval-gated AI workspace behavior are implemented. The remaining runtime checks are deliberately limited to the Oracle host because they require Docker container execution and persistent storage unavailable in the current sandbox.
