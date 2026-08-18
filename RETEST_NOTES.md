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

## Immediate repairs

The execution chain must use language-specific compiler selection for C and C++. A non-HTML run must automatically open Console, not Preview. Desktop panel layering must keep the active Result & Preview controls clickable. The user guide must make the distinction between a full SK Shell and source-run tabs clear without exposing infrastructure details.
