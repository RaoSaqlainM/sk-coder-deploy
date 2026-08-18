# Retest Notes

## Live browser observations

| Scenario | Observation | Status |
|---|---|---|
| New C++ file creation | Creating `probe.cpp` automatically opened the file in the Editor and made it active. | Passed |
| Active-file C++ Run | The application routed to the unified Result & Preview surface. The default Preview mode remained selected, so compiler output was not immediately visible. | Needs improvement |
| Result Console selection | The Files sidebar intercepted pointer events over the Console mode control, preventing the user from opening the console. | Failed |
| C++ fallback compiler choice | The Wandbox catalogue contains C-only `gcc-*-c` entries before C++ `gcc-*` entries. The current generic GCC matcher can choose the C compiler for `.cpp`, producing an `iostream` header failure. | Failed |
| Controlled C++ provider request | `gcc-13.2.0` compiled and ran a minimal `#include <iostream>` program, returning `cpp-ok`. | Passed |
| Desktop Result controls after layout repair | The Files explorer remains visible at desktop width without intercepting Result & Preview controls. Console and Runtime were both clicked successfully. | Passed |
| Repaired C++ active-file run | `probe.cpp` produced `Hello, World!` in Console with exit code 0. Runtime disclosed `wandbox-source`. | Passed |
| Python Run source tab | `print(6 * 7)` automatically opened Console and produced `42` with exit code 0. | Passed |
| Live source fallback matrix | C, C++, Python, Node, Java, Rust, Go, PHP, Ruby, and Bash all returned exit code 0 from language-correct Wandbox compilers. | Passed |
| Mobile Result & Preview | At 390 × 844, result modes occupy a reachable first row and compact viewport controls, URL entry, and actions occupy a second row without compression or overlap. | Passed |
| About user guide | Settings → About displays the public User Guide with files, editor, results, preview sizes, terminal types, independent SK Shell tabs, and approval-gated SK-AI behavior. | Passed |
| Existing file selection on mobile | Selecting `/probe.cpp` from the Files drawer closed the drawer and opened the file in the Editor. The same click handler now selects the Editor at every viewport size. | Passed |
| Separate Editor surface | After closing the Explorer dock, the active editor filled the desktop workspace without a permanently merged file sidebar. | Passed |
| Explorer first interaction | Activating Files from Editor displayed Explorer independently across the main workspace, with no editor side-by-side. | Passed |
| Explorer second interaction | Activating Files again from standalone Explorer docked Explorer beside the active Editor as an intentional optional layout. | Passed |
| Terminal surface | The visible terminal tabs are now SK Shell and AI only; legacy Python and Java source tabs are absent. Oracle-runtime unavailability is surfaced as an explicit deployment status rather than a fabricated shell result. | Passed |
| Latest desktop reload | The revised Explorer/Editor workspace reloaded successfully with the current source file and no browser console errors. | Passed |
| Reload stability after terminal cleanup | The current desktop IDE reload remained stable after the terminal transcript cleanup. | Passed |
| Final SK Shell transcript | SK Shell now shows one clear Oracle Docker availability status, offers only SK Shell and AI tabs, and retains an interactive command input. | Passed |
| Editor transition | Selecting Editor from SK Shell returned to the active C++ file in the separate full-width editor surface. | Passed |
| C++ diagnostics | A controlled unclosed-brace C++ edit produced line-specific Problems entries for both unmatched braces; restoring valid content removed the temporary diagnostics. | Passed |
| Diagnostic test cleanup | The browser workspace was reset to the original valid `probe.cpp` content after the controlled syntax test. | Passed |
| Source-file capability menu | The mobile Files view exposed Run File for `probe.cpp`, alongside normal file actions, without presenting a static-preview action. | Passed |
| Console input-before-run card | The C++ Console opened with a multiline input field and Run with input control. Input `7` and `5` was accepted and triggered a fresh execution. | Passed |
| Honest Runtime tab | The post-run Runtime tab stated `wandbox-source` and explicitly limited the fallback to source-file execution. | Passed |
| Mobile SK Shell keyboard row | At 390 × 844, Tab, up, down, left, right, Escape, and Ctrl+C appeared above the terminal input. | Passed |
| Terminal naming migration | Clearing a legacy saved terminal state and reloading rendered default tabs as SK Shell and AI Terminal. | Passed |
| Mobile AI workspace entry | The AI screen stayed reachable from the seven-item navigation, showed `probe.cpp in context`, and required provider configuration before enabling a send action. | Passed |

## Immediate repairs

The execution chain now uses language-specific compiler selection for C and C++. A non-HTML run opens Console, desktop panel layering keeps Result & Preview controls clickable, and the user guide distinguishes the full SK Shell from source execution without exposing internal infrastructure. Oracle-host-only Docker session and persistent-shell validation remains required after deployment.
