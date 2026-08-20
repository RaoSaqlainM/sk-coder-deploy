# Language Support Roadmap

## Verified Direct Runtime Tier

These languages are present in the maintained runtime image and have completed a live disposable-runner test. They may be presented as available for source execution, subject to per-run resource limits.

| Family | Languages | Current execution mode |
|---|---|---|
| JavaScript | JavaScript, TypeScript | Node.js runtime; TypeScript via installed compiler/runtime tooling. |
| Python | Python, NumPy-supported Python | Server Python runtime; Pyodide only as constrained browser fallback. |
| JVM | Java, Kotlin | OpenJDK 17 and Kotlin compiler/runtime. |
| Native | C, C++, Rust, Go | Compiler in disposable Linux runtime. |
| Scripting | PHP, Ruby, Bash | Direct interpreter in disposable Linux runtime. |

## Candidate Image Tier

These languages must not be shown as directly runnable until a dedicated image is built, constrained, tested, and added to the runtime registry. Adding every compiler to one image is rejected because it would make deployments too large and weakens maintenance and security boundaries.

| Candidate group | Languages from requested scope |
|---|---|
| .NET | C#, F#, Visual Basic .NET |
| JVM additions | Scala, Groovy, Clojure |
| Apple and mobile source | Swift, Objective-C, Dart |
| Script and dynamic | Perl, Lua, Tcl, AWK, Zsh, Fish, PowerShell, Windows Batch via a compatible interpreter |
| Functional | Haskell, Elixir, Erlang, OCaml, Scheme, Racket, Common Lisp, Idris, Agda |
| Systems | Zig, Nim, D, V, Odin, Ada, Assembly, Fortran, COBOL, Pascal, Delphi-compatible Pascal |
| Scientific | R, Julia, GNU Octave, Wolfram-compatible alternatives where licensing allows |
| Smart contract and hardware | Solidity, Vyper, Move, Cairo, Verilog, SystemVerilog, VHDL |
| Other growing languages | Crystal, Gleam, Ballerina, Pony, Red, Janet, Mojo where a supported Linux compiler is available |

## Build, Preview, or Validation Tier

These formats are useful in the editor but do not have a meaningful universal single-file “Run” action. They should expose preview, validation, or a project build command only when a project toolchain is available.

| Type | Formats |
|---|---|
| Browser preview | HTML, CSS, SVG, Markdown, reStructuredText, AsciiDoc |
| Frontend project build | React/JSX/TSX, Vue, Svelte, Astro, Sass, Less, Stylus |
| Structured-data validation | JSON, YAML, TOML, XML, INI, CSV, Protocol Buffers, GraphQL, SQL dialects, Terraform/HCL, Nginx configuration |
| Build configuration | Makefile, CMake, Gradle, Maven, Bazel, GitHub Actions, Dockerfile |

## Not a Free-Linux-Runner Promise

The application must not claim that these workloads run inside a small free Linux instance. They need proprietary tools, macOS, a device/emulator, a database service, a game engine, or significantly more compute.

| Workload | Reason |
|---|---|
| Native iOS apps, Swift UI apps, Xcode projects | Requires macOS and Apple tooling. |
| Android APK builds and emulators | Can be supported later as a dedicated Android build service, but not claimed as a general emulator on the current free runner. |
| MATLAB, SAS, Stata | Commercial licensing and/or proprietary runtime. |
| Unreal and large game-engine projects | Resource and licensing requirements beyond the execution pool. |
| Arbitrary Docker builds | The user runtime must not receive a Docker daemon or privileged container access. |

## Testing Rules

Every language moves to a higher tier only after all of the following are true:

1. Its runtime image is versioned and minimal.
2. The image runs with network, CPU, memory, process, disk, and timeout restrictions.
3. Hello-world, compiler-error, standard-input, multi-file, and cleanup tests pass.
4. The UI labels it accurately as direct, project-build, preview-only, or unavailable.
5. The User Manual is updated with the verified scope and any material limitations.

## Public Fallback Rule

Wandbox can provide source-only fallback for a changing set of compilers. Pyodide can provide constrained in-browser Python. Neither replaces a persistent shell, package manager, interactive project runtime, or multi-file project build. Any fallback response must state the actual provider tier and must never simulate terminal output.
