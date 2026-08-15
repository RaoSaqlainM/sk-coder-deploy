type RunResult = {
  output: string
  stderr: string
  exitCode: number
  error?: string
}

type WandboxResponse = {
  status?: string | number
  program_output?: string
  program_error?: string
  compiler_output?: string
  compiler_error?: string
  signal?: string
}

const WANDBOX_URL = "https://wandbox.org/api/compile.json"

type LangConfig = { compiler: string; filename: string; options?: string }

const LANG_CONFIGS: Record<string, LangConfig> = {
  cpp:        { compiler: "gcc-head",        filename: "prog.cpp"   },
  c:          { compiler: "gcc-head",        filename: "prog.c",    options: "-x c -std=c17" },
  java:       { compiler: "openjdk-head",    filename: "Main.java"  },
  kotlin:     { compiler: "kotlin-head",     filename: "Main.kt"    },
  rust:       { compiler: "rust-head",       filename: "prog.rs"    },
  go:         { compiler: "go-head",         filename: "prog.go"    },
  ruby:       { compiler: "ruby-head",       filename: "prog.rb"    },
  php:        { compiler: "php-head",        filename: "prog.php"   },
  swift:      { compiler: "swift-head",      filename: "prog.swift" },
  python:     { compiler: "cpython-head",    filename: "prog.py"    },
  javascript: { compiler: "nodejs-head",     filename: "prog.js"    },
  typescript: { compiler: "typescript-head", filename: "prog.ts"    },
  bash:       { compiler: "bash",            filename: "prog.sh"    },
  r:          { compiler: "r-head",          filename: "prog.r"     },
}

const JAVA_FALLBACKS = ["openjdk-head", "java-head", "java-openjdk-17.0.2", "openjdk-jdk-20+36"]
let _javaCompiler: string | null = null

async function runWandbox(compiler: string, code: string, filename: string, options?: string, stdin = ""): Promise<WandboxResponse | null> {
  const body: Record<string, string> = { compiler, code, filename }
  if (options) body["compiler-option-raw"] = options
  if (stdin) body.stdin = stdin
  const res = await fetch(WANDBOX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  return res.json() as Promise<WandboxResponse>
}

async function resolveJavaCompiler(code: string, filename: string): Promise<RunResult> {
  if (_javaCompiler) {
    const data = await runWandbox(_javaCompiler, code, filename)
    if (data) return extractResult(data)
  }
  for (const compiler of JAVA_FALLBACKS) {
    try {
      const data = await runWandbox(compiler, code, filename)
      if (data && !String(data.status ?? "").includes("error")) {
        _javaCompiler = compiler
        return extractResult(data)
      }
    } catch { /* try next */ }
  }
  return { output: "", stderr: "Java compiler not found on Wandbox. Check https://wandbox.org for available Java compilers.", exitCode: 1 }
}

function extractResult(data: WandboxResponse): RunResult {
  const programOut = (data.program_output ?? "").trimEnd()
  const programErr = (data.program_error ?? "").trimEnd()
  const compileErr = (data.compiler_error ?? "").trimEnd()
  const exitCode = Number(data.status ?? 0)
  return {
    output: programOut,
    stderr: [programErr, compileErr].filter(Boolean).join("\n"),
    exitCode,
  }
}

export async function runWithPiston(code: string, language: string, _unused = "", stdin = ""): Promise<RunResult> {
  const cfg = LANG_CONFIGS[language]
  if (!cfg) {
    return { output: "", stderr: `Language "${language}" is not supported. Supported: ${Object.keys(LANG_CONFIGS).join(", ")}`, exitCode: 1, error: "unsupported" }
  }

  if (language === "java") {
    return resolveJavaCompiler(code, cfg.filename)
  }

  try {
    const data = await runWandbox(cfg.compiler, code, cfg.filename, cfg.options, stdin)
    if (!data) {
      return { output: "", stderr: `Wandbox returned an error. Check your internet or try again.`, exitCode: 1 }
    }
    return extractResult(data)
  } catch (e) {
    return { output: "", stderr: `Network error connecting to Wandbox: ${String(e)}. Check your internet connection.`, exitCode: 1, error: "network" }
  }
}

export function getAvailableLanguages() {
  return Object.keys(LANG_CONFIGS)
}

export function detectLanguageFromExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  const extMap: Record<string, string> = {
    cpp: "cpp", cc: "cpp", cxx: "cpp", c: "c", h: "c",
    java: "java", kt: "kotlin", rs: "rust", go: "go",
    rb: "ruby", php: "php", swift: "swift", r: "r",
    sh: "bash", bash: "bash", py: "python",
    js: "javascript", ts: "typescript",
  }
  return extMap[ext] || ""
}
