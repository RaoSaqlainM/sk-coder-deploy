import { runPython } from "./pyodideRunner"

export type ExecutionTier = "oracle-workspace" | "wandbox-source" | "pyodide-browser" | "unavailable"

export interface ExecResponse {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  tier: ExecutionTier
  capability: string
}

type RuntimeConfig = {
  backend: string
  wandboxPrefixes: string[]
  filename: string
  compilerFilter?: (name: string) => boolean
}

type WandboxCompiler = { name: string }

const WANDBOX_RUN_URL = "https://wandbox.org/api/compile.json"
const WANDBOX_CATALOG_URL = "https://wandbox.org/api/list.json"
const CATALOG_TTL_MS = 10 * 60 * 1000

const RUNTIME_CONFIGS: Record<string, RuntimeConfig> = {
  node: { backend: "node", wandboxPrefixes: ["nodejs-"], filename: "main.js" },
  javascript: { backend: "node", wandboxPrefixes: ["nodejs-"], filename: "main.js" },
  js: { backend: "node", wandboxPrefixes: ["nodejs-"], filename: "main.js" },
  mjs: { backend: "node", wandboxPrefixes: ["nodejs-"], filename: "main.mjs" },
  cjs: { backend: "node", wandboxPrefixes: ["nodejs-"], filename: "main.cjs" },
  jsx: { backend: "node", wandboxPrefixes: ["nodejs-"], filename: "main.jsx" },
  typescript: { backend: "typescript", wandboxPrefixes: ["typescript-"], filename: "main.ts" },
  ts: { backend: "typescript", wandboxPrefixes: ["typescript-"], filename: "main.ts" },
  tsx: { backend: "typescript", wandboxPrefixes: ["typescript-"], filename: "main.tsx" },
  python: { backend: "python", wandboxPrefixes: ["cpython-"], filename: "main.py" },
  python3: { backend: "python", wandboxPrefixes: ["cpython-"], filename: "main.py" },
  py: { backend: "python", wandboxPrefixes: ["cpython-"], filename: "main.py" },
  java: { backend: "java", wandboxPrefixes: ["openjdk-jdk-", "openjdk-"], filename: "Main.java" },
  c: { backend: "c", wandboxPrefixes: ["gcc-"], filename: "main.c", compilerFilter: (name) => name.endsWith("-c") },
  cpp: { backend: "cpp", wandboxPrefixes: ["gcc-"], filename: "main.cpp", compilerFilter: (name) => !name.endsWith("-c") && !name.endsWith("-pp") },
  cc: { backend: "cpp", wandboxPrefixes: ["gcc-"], filename: "main.cpp", compilerFilter: (name) => !name.endsWith("-c") && !name.endsWith("-pp") },
  cxx: { backend: "cpp", wandboxPrefixes: ["gcc-"], filename: "main.cpp", compilerFilter: (name) => !name.endsWith("-c") && !name.endsWith("-pp") },
  rust: { backend: "rust", wandboxPrefixes: ["rust-"], filename: "main.rs" },
  rs: { backend: "rust", wandboxPrefixes: ["rust-"], filename: "main.rs" },
  go: { backend: "go", wandboxPrefixes: ["go-"], filename: "main.go" },
  php: { backend: "php", wandboxPrefixes: ["php-"], filename: "main.php" },
  ruby: { backend: "ruby", wandboxPrefixes: ["ruby-"], filename: "main.rb" },
  rb: { backend: "ruby", wandboxPrefixes: ["ruby-"], filename: "main.rb" },
  kotlin: { backend: "kotlin", wandboxPrefixes: [], filename: "Main.kt" },
  kt: { backend: "kotlin", wandboxPrefixes: [], filename: "Main.kt" },
  kts: { backend: "kotlin", wandboxPrefixes: [], filename: "Main.kts" },
  bash: { backend: "bash", wandboxPrefixes: ["bash"], filename: "main.sh" },
  sh: { backend: "bash", wandboxPrefixes: ["bash"], filename: "main.sh" },
}

let wandboxCatalog: { value: WandboxCompiler[]; updatedAt: number } | null = null

function isFresh(updatedAt: number) {
  return Date.now() - updatedAt < CATALOG_TTL_MS
}

function isInfrastructureFailure(stderr: string) {
  const value = stderr.toLowerCase()
  return value.includes("catatonit") || value.includes("failed to exec pid1") || value.includes("runtime unavailable") || value.includes("container unavailable") || value.includes("isolated runtime service") || value.includes("oci runtime error") || value.includes("crun: clone") || value.includes("resource temporarily unavailable")
}

async function getWandboxCatalog(): Promise<WandboxCompiler[]> {
  if (wandboxCatalog && isFresh(wandboxCatalog.updatedAt)) return wandboxCatalog.value
  const response = await fetch(WANDBOX_CATALOG_URL, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`Wandbox compiler catalog returned ${response.status}`)
  const value = await response.json() as WandboxCompiler[]
  wandboxCatalog = { value, updatedAt: Date.now() }
  return value
}

async function tryWandbox(language: string, code: string, stdin = ""): Promise<ExecResponse | null> {
  try {
    const config = RUNTIME_CONFIGS[language]
    if (!config || config.wandboxPrefixes.length === 0) return null
    const compilers = await getWandboxCatalog()
    const matches = compilers.filter((item) => config.wandboxPrefixes.some((prefix) => item.name.startsWith(prefix)) && (!config.compilerFilter || config.compilerFilter(item.name)))
    const compiler = matches.find((item) => !item.name.includes("head")) ?? matches[0]
    if (!compiler) return null
    const source = language === "java"
      ? code.replace(/\bpublic\s+(?:final\s+)?class\s+([A-Za-z_$][\w$]*)/, "class $1")
      : code
    const response = await fetch(WANDBOX_RUN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler: compiler.name, code: source, filename: config.filename, stdin }),
      signal: AbortSignal.timeout(35000),
    })
    if (!response.ok) return null
    const data = await response.json() as { status?: string | number; program_output?: string; program_error?: string; compiler_error?: string }
    const stderr = [data.program_error, data.compiler_error].filter(Boolean).join("\n")
    return {
      stdout: data.program_output ?? "",
      stderr,
      exitCode: Number(data.status ?? (stderr ? 1 : 0)),
      executionTime: 0,
      tier: "wandbox-source",
      capability: stdin ? "Public fallback ran this source file with input supplied before launch. Shell commands, packages, project files, live prompts, and persistence require Oracle." : "Public fallback ran this source file only. Shell commands, packages, project files, and persistence require Oracle.",
    }
  } catch {
    return null
  }
}

async function tryPyodide(code: string): Promise<ExecResponse | null> {
  try {
    const { output, error } = await runPython(code)
    return {
      stdout: output,
      stderr: error,
      exitCode: error ? 1 : 0,
      executionTime: 0,
      tier: "pyodide-browser",
      capability: "Browser Python fallback ran this source only. Packages, shell commands, and project files require Oracle.",
    }
  } catch {
    return null
  }
}

async function tryBackend(language: string, code: string, stdin = ""): Promise<ExecResponse | null> {
  try {
    const deviceId = localStorage.getItem("sk-device-id") || "anonymous"
    const response = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
      body: JSON.stringify({ language, code, stdin }),
      signal: AbortSignal.timeout(35000),
    })
    if (!response.ok) return null
    const data = await response.json() as { stdout?: string; stderr?: string; exitCode?: number; executionTime?: number; error?: string }
    if (data.error) return null
    const result = {
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? "",
      exitCode: data.exitCode ?? 1,
      executionTime: data.executionTime ?? 0,
      tier: "oracle-workspace" as const,
      capability: stdin ? "Oracle isolated workspace executed this code with input supplied before launch. Use SK Shell for live prompts, commands, packages, and project work." : "Oracle isolated workspace executed this code. SK Shell and project commands use the same session runtime.",
    }
    return isInfrastructureFailure(result.stderr) ? null : result
  } catch {
    return null
  }
}

export async function execute(language: string, code: string, options?: { stdin?: string }): Promise<ExecResponse> {
  const normalized = language.toLowerCase()
  const startedAt = Date.now()
  const config = RUNTIME_CONFIGS[normalized]
  const stdin = options?.stdin ?? ""
  const backend = config ? await tryBackend(config.backend, code, stdin) : null
  if (backend) return backend
  const wandbox = await tryWandbox(normalized, code, stdin)
  if (wandbox) return wandbox
  if (["python", "python3", "py"].includes(normalized)) {
    const pyodide = await tryPyodide(code)
    if (pyodide) return pyodide
  }
  const label = normalized === "node" || normalized === "javascript" || normalized === "js" ? "Node.js" : language
  return {
    stdout: "",
    stderr: `No runtime is available for ${label}. Connect the Oracle backend for the primary workspace runtime or retry while a supported public source provider is online.`,
    exitCode: 1,
    executionTime: Date.now() - startedAt,
    tier: "unavailable",
      capability: stdin ? "No available source runner accepted this input-dependent file. SK Shell on Oracle provides live prompts, projects, packages, and persistence." : "No fallback can provide a shell session, dependency installation, multi-file project, or persistent workspace without Oracle.",
  }
}
