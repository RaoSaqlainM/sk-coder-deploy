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
| GitHub entry point | The GitHub tab rendered the fine-grained token setup path without requiring a token. | Live browser verified. |
| GitHub repository import | The repository panel now provides Import to Explorer using an explicit user token and a bounded text-file import path. | Frontend typecheck and release build passed; a live private-repository import requires a user token and was not performed. |
| Explorer multi-selection | Mobile selection mode opened from the Explorer header, showed a selected-count toolbar, and enabled Copy, Move, Download, Delete, and Done only after an item was selected. Desktop right-click menus also expose Select alongside ordinary file actions. | Live browser verified at 500 px width. |
| Safe batch movement | Batch copy and move use an explicit destination-folder selection path; internal Explorer moves no longer trigger the external import drop zone. | Frontend typecheck and release build passed. |
| Local credential controls | Settings now explains browser-local key and token storage and provides explicit API-key removal and GitHub disconnect controls. | Frontend typecheck verified. |
| Detailed user manual | Help now covers multi-selection, movement, downloads, GitHub import and push, fine-grained token permissions, Program input, Interactive terminal, and result limits. | Frontend typecheck verified. |
| Restarted service health | The API server and Vite frontend were restarted and both local health requests completed. | Live request verified. |
| Per-terminal history clear | The Clear terminal control opened the browser-native confirmation “Clear the history for SK Shell?”; accepting it removed the active shell transcript, command-history cursor, and command-line draft while the IDE remained interactive. | Live browser verified. |
| Direct Run File routing | Explorer’s C++ Run File action opened the unified Result Center directly, displaying `probe.cpp`, `Hello, World!`, and exit code 0 without first opening Terminal. | Live browser verified. |
| ZIP-compatible archive import | ZIP, JAR, APK, XAPK, APKS, WAR, EAR, and AAR imports are inspected and extracted into a same-named folder; unsupported containers remain ordinary files with a clear error. | Frontend typecheck and release build passed. |
| Terminal working-directory display | When a live workspace is connected, a successful `cd` now updates the local prompt path so the visible prompt matches the selected terminal directory. | Frontend typecheck verified. |
| Expanded capability manual | Help now includes a language-by-language capability table, archive rules, realistic game and native-GUI limits, and APK editor scope. | Frontend typecheck verified. |
| Direct top-bar execution route | Top-bar Run opened Result Center directly for `probe.cpp`, returned `Hello, World!`, and did not append source-run status or output to SK Shell. | Live browser verified. |
| Result loading feedback | Shared source-run state switches Result Center to Console, identifies the active file, displays a Running status and progress indicator while execution is in flight, and replaces the result when complete. | Typecheck and release build passed; live source execution completed in Result Center. |
| Explorer and Terminal scrolling | Explorer and Terminal now have independent, bounded `overflow: auto` regions with mouse, scrollbar, touch-pan, and keyboard-compatible semantics instead of relying on page scrolling. | Live DOM geometry and responsive browser smoke check verified. |
| Compact terminal command line | SK Shell uses a focused native one-line terminal input with paste, copy, select-all, touch selection, Enter-to-send, Tab completion, and Up/Down command history. Multi-line program input remains in Result Center. | Live browser verified. |
| Expanded SK-AI composer | The main SK-AI panel exposes a 76 px multi-line native composer, retains active-file context, and supports normal browser editing controls. | Live browser verified. |
| Explicit JAR extraction | Explorer visibly exposes Extract. A valid JAR ZIP fixture was selected and extracted into the `validation` folder containing `inside.txt`; the fixture was then deleted, restoring the original workspace. | Live browser verified. |
| Public documentation routes | `/guide`, `/privacy`, and `/terms` remain standalone public pages, linked outside Settings. The updated Guide covers direct Result Center loading, Extract, input controls, GitHub/Codespaces separation, and capability limits. | Live browser, typecheck, and release build verified. |
| AI and GitHub boundaries | SK-AI receives active-file-first supplied workspace excerpts, proposes bounded actions for approval, sends approved single-file source runs to Result Center, and sends package/project commands to SK Shell. GitHub import/export via a fine-grained token is distinct from a Codespaces handoff. | Frontend typecheck and release build passed; private-token operations were not performed. |
| Standalone public-page entry | The IDE header has a Help action that opens the standalone `/guide` route, which retains a Back to SK Coder action and links to separate Privacy and Terms pages. | Live browser verified. |
| Focused Run visibility | Top-bar Run is absent while Files and Terminal are active and appears only for a runnable source open in the focused Editor. | Live browser verified. |
| Java source execution | A temporary `Main.java` file exposed Run in Editor. Its normal `public class Main` source completed through the public fallback, displayed `Hello, World!`, and returned exit code 0 in Result Center. | Live browser verified. |
| Runnable alias alignment | Every extension currently exposed by the Run capability gate maps to a concrete executor alias, including C++ `.cxx` and Kotlin `.kts`. | Frontend typecheck verified. |
| Image preview | An imported PNG opened directly in Preview and rendered as a contained image with its filename; the validation file was deleted afterward. | Live browser verified. |
| GitHub connection entry | The GitHub tab showed the user-authorized fine-grained-token connection card with Contents read for import, Contents write for push, and optional Codespaces access. | Live browser verified. |
| Workspace session status | The frontend now checks API health and workspace runtime readiness separately. When the API is reachable but no runtime is ready, SK Shell shows one concise waiting notice and does not open a failing shell socket. It connects automatically when the configured runtime reports ready. | Live browser and local API status verified. |
| Selectable terminal screen | Terminal output uses its own scroll container with `overflow: auto`, touch pan, and browser text selection enabled. Output clicks no longer force focus into the command prompt. | Live DOM style verified. |
| Files-first launch | A fresh live load opens the separate Files workspace with Explorer only. Editor appears after an editable file is selected. | Live browser verified. |
| Focused Run control | Terminal showed no top-bar Run action. Selecting `probe.cpp` from Files opened Editor and displayed Run there. | Live browser verified. |
| Developer About card | Settings → About renders the supplied developer portrait at its native 928 × 1120 source size, creator card, local edit-gate control, and simple User Guide, Privacy, and Terms links. | Live browser verified. |
| Simplified public guidance | The Guide now describes SK Shell as a compact selectable terminal, states the connected-workspace requirement in plain language, and distinguishes supported run paths from files that are edit-only. | Frontend typecheck and release build passed. |

## Verification details

The latest frontend production build completed with 1,698 transformed modules. The build emitted two non-blocking optimization warnings: a JSZip import cannot be split because it is also statically imported elsewhere, and the resulting main JavaScript chunk is above Vite's 500 kB advisory threshold. These warnings do not prevent deployment or execution, but they identify a future optimization opportunity to code-split non-critical IDE panels. The API server typecheck and production bundle build also passed.

The connected browser completed a final responsive visual smoke check. At a 390 × 844 viewport, the terminal keyboard row and all seven bottom-navigation destinations remained reachable. The source-file menu exposed only the applicable run affordance; C++ execution opened the shared Console, exposed the pre-run input control, and the Runtime tab truthfully disclosed the active public fallback. The AI workspace remained visible with active-file context and an explicit configuration-required state rather than a fabricated response.

The safe-upgrade browser check re-ran the C++ flow after the Result Center revision. The Console identified `probe.cpp`, showed a completed state, kept Program input collapsed until requested, and offered an explicit Interactive terminal route. The compact mobile layout retained both actions without covering the seven-tab navigation. The public Help and Privacy pages rendered independently of the IDE and used task-focused language with professional footer links. The frontend release build and backend typecheck and bundle build passed; Vite reported only its existing non-blocking JSZip and bundle-size optimization warnings.

The current GitHub and Explorer upgrade was checked after restarting both local services. The mobile-width live Explorer showed the new Select control, then displayed the zero-selection toolbar and enabled Copy, Move, Download, and Delete after `probe.cpp` was selected without opening or changing the file. The test-only file created during an attempted automated stdin program edit was removed, restoring the original Explorer file set. The GitHub tab correctly showed its disconnected fine-grained token entry point. Repository import is intentionally not live-tested without a user-provided token because importing a private repository would access user data. The bounded import implementation and Settings credential-removal controls passed frontend typecheck and release build verification.

The final terminal and routing repair smoke check reopened the responsive SK Shell, invoked Clear terminal, accepted the native browser confirmation, and confirmed the terminal body was empty while navigation and the command field remained available. Explorer then opened the C++ context menu and selected Run File. The UI transitioned directly to the Result Center, not Terminal, where the completed `probe.cpp` result showed `Hello, World!` and exit code 0. This confirms both repairs in the live browser using the current development build.

The current usability round reopened the live IDE at a 500 px mobile-width viewport. The Explorer header showed a distinct Extract control. Uploading a valid ZIP-compatible `validation.jar` through that action created a same-named `validation` folder with its contained `inside.txt` entry; the test folder was deleted immediately afterward, returning the workspace to its prior `probe.cpp` state. The top-bar C++ run opened Result Center directly and completed without opening Terminal. The Result Center has a shared running state and loading indicator for in-flight runs. SK-AI retains its native multi-line composer; SK Shell now uses a compact single-line command prompt with copy, paste, selection, Tab completion, and keyboard or accessory-button Up/Down history. A harmless `echo history-check` command was submitted and then restored from history with the physical Up Arrow. The standalone `/guide` route is available from the new IDE-header Help action and includes the updated workflow guidance. Frontend typecheck, Vite production build, API typecheck, and API production bundle all passed. Vite retained only its existing non-blocking JSZip chunking and bundle-size optimization warnings.

The final interaction check confirmed that Files hides the top-bar Run control, while opening a runnable file in Editor restores it. A temporary Java `Main.java` file offered Run and initially exposed a public-runner filename mismatch; the source fallback was corrected to compile valid `public class` input despite that host limitation. Re-running it produced `Hello, World!` and exit code 0 in Result Center, with no Terminal redirect. The GitHub tab displayed the fine-grained-token connection entry, and a temporary imported PNG opened into a contained media preview rather than Monaco. Both temporary test files were deleted, restoring the Explorer to the original `probe.cpp` file set.

The workspace-connection round confirmed that the local API health route responds successfully while its workspace runtime reports `ready: false` because Docker is intentionally unavailable in this sandbox. The client now treats these as distinct conditions: it shows one waiting notice and avoids creating a failing shell socket until the host reports a ready runtime. The live 500 px screen first opened directly into Explorer, without merging it with Editor. Terminal exposed no top-bar Run action, and selecting `probe.cpp` moved to Editor where Run appeared. The terminal output style returned `user-select: text`, `overflow-y: auto`, and touch pan, while no output click handler remained to steal selection. Settings → About loaded the supplied portrait and simple public links. Frontend typecheck, Vite production build, API typecheck, and API bundle build all passed.

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
