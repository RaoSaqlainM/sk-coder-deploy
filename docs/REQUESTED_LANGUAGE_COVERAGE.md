# Requested Language and Project Coverage

## Meaning of Each Status

| Status | Meaning |
|---|---|
| Direct now | Present in the current isolated runtime image and suitable for a tested source run. |
| Dedicated image | Can be added only after its own runtime image, resource policy, standard-input, multi-file, cleanup, and security tests pass. |
| Project build | Requires a project toolchain and an explicit approved build command rather than a universal one-file Run action. |
| Preview or validate | Suitable for rendering, editing, or validation, not generic code execution. |
| External environment | Requires an external service, database, device, proprietary software, macOS, or game engine. |

## Web and Frontend

| Requested types | Status | Current action |
|---|---|---|
| HTML, CSS, SVG, Markdown, reStructuredText, AsciiDoc | Preview or validate | Editor and Preview. |
| JavaScript, TypeScript | Direct now | Node source run; project commands through approved SK Shell. |
| JSX, TSX, React, Vue, Svelte, Astro | Project build | Editor and project preview after package/toolchain setup. |
| Sass, SCSS, Less, Stylus | Project build | Compile only through the matching installed project toolchain. |
| WebAssembly text (`.wat`, `.wast`) | Dedicated image | Add a Wasm toolchain image and test compilation. |

## General, JVM, .NET, and Systems Languages

| Requested types | Status | Current action |
|---|---|---|
| Python, Java, C, C++, Go, Rust, Kotlin, Ruby, PHP, Bash | Direct now | Run or compile through the isolated runtime. |
| C#, F#, Visual Basic .NET | Dedicated image | Add `runtime-dotnet`. |
| Scala, Groovy, Clojure | Dedicated image | Add `runtime-jvm-extra`. |
| Swift, Objective-C | External environment | Linux syntax/edit support is possible; Apple app builds need macOS/Xcode. |
| Dart, Flutter | Dedicated image / project build | Add a Dart image; Flutter/mobile builds need separate Android or iOS build infrastructure. |
| Perl, Lua, Tcl, AWK, Zsh, Fish, PowerShell, Windows Batch, Expect | Dedicated image | Add a scripting image; Windows Batch needs a compatible non-Windows interpreter or a Windows worker. |
| Zig, Nim, D, V, Odin, Assembly, Ada | Dedicated image | Add native-extra images after compiler-specific tests. |

## Functional, Scientific, Historical, and Growing Languages

| Requested types | Status | Current action |
|---|---|---|
| Haskell, Elixir, Erlang, OCaml, Scheme, Racket, Common Lisp, Idris, Agda | Dedicated image | Add functional images one family at a time. |
| Elm, PureScript | Project build | Install compiler in a web-build image and test project compilation. |
| R, Julia, GNU Octave | Dedicated image | Add scientific images with strict memory and package controls. |
| MATLAB, Wolfram, Stata, SAS | External environment | Proprietary license or vendor runtime required. |
| Fortran, COBOL, Pascal, Delphi-compatible Pascal, Prolog, Basic, Forth, Smalltalk, Modula-2, ALGOL, APL, J | Dedicated image | Add only after selecting maintained compiler/interpreter and testing it. |
| ABAP | External environment | SAP environment is required. |
| Crystal, Gleam, Carbon, Mojo, Ballerina, Pony, Red, Janet | Dedicated image | Add only where a supported Linux toolchain is available and tested. |
| Brainfuck, Befunge, Whitespace, LOLCODE, Malbolge | Dedicated image | Optional low-priority educational interpreters, never a production runtime claim. |

## Data, Databases, Contracts, Hardware, Mobile, and Games

| Requested types | Status | Current action |
|---|---|---|
| JSON, YAML, TOML, XML, INI, CSV, TSV, Properties, `.env`, GraphQL, Protocol Buffers, Terraform/HCL, Nginx config, CI files | Preview or validate | Edit and schema/lint validation where a safe validator is installed. |
| SQL, PL/SQL, T-SQL, SPARQL, Cypher | External environment | Syntax validation is possible; execution needs the corresponding database connection and credentials. |
| Solidity, Vyper, Move, Cairo | Dedicated image | Contract compiler image plus explicit chain/tool version. |
| Verilog, SystemVerilog, VHDL | Dedicated image | Hardware simulator image and isolated resource policy. |
| Swift iOS, Kotlin/Java Android, Flutter | External environment | Source editing is supported; device/emulator/app builds need dedicated mobile infrastructure. |
| Dockerfile, Makefile, CMake, Gradle, Maven, Bazel | Project build | Execute only as approved project commands with the required tools present. Docker builds are not permitted in the user runner. |
| GDScript, UnrealScript, Papyrus, game Lua | External environment | Editor support; full game execution requires the relevant engine or game mod environment. |
