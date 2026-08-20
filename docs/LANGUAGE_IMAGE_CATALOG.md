# Language Image Catalogue and Runner Queue

## Rule

SK Coder can recognize and edit a very large number of file extensions, but it must only show **Run** or **Compile** when a tested runtime image is available. File recognition is not runtime support.

## Current Verified Image

| Image | Languages | Workspace capability |
|---|---|---|
| `sk-coder-runtime:latest` | Node.js, TypeScript, Python with NumPy, Java, Kotlin, C, C++, Rust, Go, PHP, Ruby, Bash | Isolated workspace, terminal commands, source runs, standard input, and project tools subject to resource policy. |

## Image Families to Add Separately

| Family image | Candidate languages | Reason for separate image |
|---|---|---|
| `runtime-dotnet` | C#, F#, Visual Basic .NET | Large SDK and distinct package/build tooling. |
| `runtime-jvm-extra` | Scala, Groovy, Clojure | JVM dependencies should not enlarge the base runtime for every user. |
| `runtime-functional` | Haskell, OCaml, Elixir, Erlang, Racket, Scheme, Common Lisp | Compiler and package ecosystems differ significantly. |
| `runtime-native-extra` | Zig, Nim, D, V, Odin, Ada, Fortran, COBOL, Pascal | Native compilers need individual hardening and multi-file tests. |
| `runtime-scientific` | R, Julia, Octave | Large package and memory requirements. |
| `runtime-scripting-extra` | Perl, Lua, Tcl, AWK, Fish, Zsh, PowerShell | Interpreter and shell differences need explicit command policy. |
| `runtime-web-build` | Dart, Sass, Less, Stylus, Vue, Svelte, Astro tools | Project build rather than universal single-file execution. |
| `runtime-hardware` | Verilog, SystemVerilog, VHDL | Simulator tooling and separate resource controls. |
| `runtime-contract` | Solidity, Vyper, Move, Cairo | Compiler versions, chain-specific output, and security-sensitive toolchains. |

## Runner Queue Policy

1. Each run requests an image family from a registry, never from user-supplied Docker configuration.
2. The backend starts a disposable worker only when that image family has capacity.
3. If capacity is full, the run waits in a bounded queue and the user sees a truthful waiting state, not fake output.
4. Each worker receives a temporary source copy, fixed CPU, memory, process, disk, network, and time limits.
5. Output is returned to the Result Center. Source staging, compiler output, package artifacts, and logs are then cleaned by independent retention rules.
6. A language enters the visible Run menu only after hello-world, compiler-error, stdin, multi-file, cleanup, capacity, and security tests pass on Oracle.

## File-Type Actions

| File class | User action |
|---|---|
| Verified direct runtime | Run or Compile, then Result Center. |
| Installed project toolchain | Project build/run after explicit approval in SK Shell. |
| Browser content | Preview for HTML, CSS-linked projects, images, video, audio, PDF, Markdown, and compatible text. |
| Structured configuration | Edit and validate where a safe validator exists. |
| Candidate runtime | Edit only with an honest “runtime image not installed” state until verified. |
| Proprietary/device-bound workload | Edit and inspect only; recommend the required external environment without pretending it runs in the free Linux runner. |
