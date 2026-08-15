import { runPython } from "./pyodideRunner"

export interface ExecResponse {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
}

type RuntimeConfig = {
  piston: string
  wandboxPrefixes: string[]
  filename: string
}

type PistonRuntime = { language: string; version: string }
type WandboxCompiler = { name: string }

const PISTON_URL = "https://emkc.org/api/v2/piston"
const WANDBOX_RUN_URL = "https://wandbox.org/api/compile.json"
const WANDBOX_CATALOG_URL = "https://wandbox.org/api/list.json"
const CATALOG_TTL_MS = 10 * 60 * 1000

const RUNTIME_CONFIGS: Record<string, RuntimeConfig> = {
  node: { piston: "javascript", wandboxPrefixes: ["nodejs-"], filename: "main.js" },
  javascript: { piston: "javascript", wandboxPrefixes: ["nodejs-"], filename: "main.js" },
  js: { piston: "javascript", wandboxPrefixes: ["nodejs-"], filename: "main.js" },
  jsx: { piston: "javascript", wandboxPrefixes: ["nodejs-"], filename: "main.js" },
  typescript: { piston: "typescript", wandboxPrefixes: ["typescript-"], filename: "main.ts" },
  ts: { piston: "typescript", wandboxPrefixes: ["typescript-"], filename: "main.ts" },
  tsx: { piston: "typescript", wandboxPrefixes: ["typescript-"], filename: "main.ts" },
  python: { piston: "python", wandboxPrefixes: ["cpython-"], filename: "main.py" },
  py: { piston: "python", wandboxPrefixes: ["cpython-"], filename: "main.py" },
  java: { piston: "java", wandboxPrefixes: ["openjdk-jdk-", "openjdk-"], filename: "Main.java" },
  cpp: { piston: "cpp", wandboxPrefixes: ["gcc-"], filename: "main.cpp" },
  c: { piston: "c", wandboxPrefixes: ["gcc-"], filename: "main.c" },
  kotlin: { piston: "kotlin", wandboxPrefixes: ["kotlin-"], filename: "main.kt" },
  kt: { piston: "kotlin", wandboxPrefixes: ["kotlin-"], filename: "main.kt" },
  rust: { piston: "rust", wandboxPrefixes: ["rust-"], filename: "main.rs" },
  rs: { piston: "rust", wandboxPrefixes: ["rust-"], filename: "main.rs" },
  go: { piston: "go", wandboxPrefixes: ["go-"], filename: "main.go" },
  ruby: { piston: "ruby", wandboxPrefixes: ["ruby-"], filename: "main.rb" },
  rb: { piston: "ruby", wandboxPrefixes: ["ruby-"], filename: "main.rb" },
  php: { piston: "php", wandboxPrefixes: ["php-"], filename: "main.php" },
  bash: { piston: "bash", wandboxPrefixes: ["bash"], filename: "main.sh" },
  sh: { piston: "bash", wandboxPrefixes: ["bash"], filename: "main.sh" },
}

let pistonCatalog: { value: PistonRuntime[]; updatedAt: number } | null = null
let wandboxCatalog: { value: WandboxCompiler[]; updatedAt: number } | null = null

function isFresh(updatedAt: number) {
  return Date.now() - updatedAt < CATALOG_TTL_MS
}

function compareVersions(a: string, b: string) {
  const parts = (value: string) => value.match(/\d+/g)?.map(Number) ?? [0]
  const left = parts(a)
  const right = parts(b)
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (right[index] ?? 0) - (left[index] ?? 0)
    if (delta) return delta
  }
  return 0
}

function isInfrastructureFailure(stderr: string) {
  const value = stderr.toLowerCase()
  return value.includes("catatonit") || value.includes("failed to exec pid1") || value.includes("runtime unavailable") || value.includes("container unavailable")
}

async function getPistonCatalog(): Promise<PistonRuntime[]> {
  if (pistonCatalog && isFresh(pistonCatalog.updatedAt)) return pistonCatalog.value
  const response = await fetch(`${PISTON_URL}/runtimes`, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`Piston runtime catalog returned ${response.status}`)
  const value = await response.json() as PistonRuntime[]
  pistonCatalog = { value, updatedAt: Date.now() }
  return value
}

async function getWandboxCatalog(): Promise<WandboxCompiler[]> {
  if (wandboxCatalog && isFresh(wandboxCatalog.updatedAt)) return wandboxCatalog.value
  const response = await fetch(WANDBOX_CATALOG_URL, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`Wandbox compiler catalog returned ${response.status}`)
  const value = await response.json() as WandboxCompiler[]
  wandboxCatalog = { value, updatedAt: Date.now() }
  return value
}

async function tryPiston(language: string, code: string): Promise<ExecResponse | null> {
  try {
    const config = RUNTIME_CONFIGS[language]
    if (!config) return null
    const runtimes = await getPistonCatalog()
    const runtime = runtimes
      .filter((item) => item.language === config.piston)
      .sort((left, right) => compareVersions(left.version, right.version))[0]
    if (!runtime) return null
    const response = await fetch(`${PISTON_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: runtime.language, version: runtime.version, files: [{ name: config.filename, content: code }] }),
      signal: AbortSignal.timeout(35000),
    })
    if (!response.ok) return null
    const data = await response.json() as { run?: { stdout?: string; stderr?: string; code?: number; time?: string } }
    const run = data.run
    if (!run) return null
    const result = {
      stdout: run.stdout ?? "",
      stderr: run.stderr ?? "",
      exitCode: run.code ?? 1,
      executionTime: run.time ? Math.round(Number.parseFloat(run.time) * 1000) : 0,
    }
    return isInfrastructureFailure(result.stderr) ? null : result
  } catch {
    return null
  }
}

async function tryWandbox(language: string, code: string): Promise<ExecResponse | null> {
  try {
    const config = RUNTIME_CONFIGS[language]
    if (!config) return null
    const compilers = await getWandboxCatalog()
    const matches = compilers.filter((item) => config.wandboxPrefixes.some((prefix) => item.name.startsWith(prefix)))
    const compiler = matches.find((item) => !item.name.includes("head")) ?? matches[0]
    if (!compiler) return null
    const response = await fetch(WANDBOX_RUN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler: compiler.name, code, filename: config.filename }),
      signal: AbortSignal.timeout(35000),
    })
    if (!response.ok) return null
    const data = await response.json() as { status?: string | number; program_output?: string; program_error?: string; compiler_error?: string }
    const stderr = [data.program_error, data.compiler_error].filter(Boolean).join("\n")
    return { stdout: data.program_output ?? "", stderr, exitCode: Number(data.status ?? (stderr ? 1 : 0)), executionTime: 0 }
  } catch {
    return null
  }
}

async function tryPyodide(code: string): Promise<ExecResponse | null> {
  try {
    const { output, error } = await runPython(code)
    return { stdout: output, stderr: error, exitCode: error ? 1 : 0, executionTime: 0 }
  } catch {
    return null
  }
}

async function tryBackend(language: string, code: string): Promise<ExecResponse | null> {
  try {
    const deviceId = localStorage.getItem("sk-device-id") || "anonymous"
    const response = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
      body: JSON.stringify({ language, code }),
      signal: AbortSignal.timeout(35000),
    })
    if (!response.ok) return null
    const data = await response.json() as { stdout?: string; stderr?: string; exitCode?: number; executionTime?: number; error?: string }
    if (data.error) return null
    const result = { stdout: data.stdout ?? "", stderr: data.stderr ?? "", exitCode: data.exitCode ?? 1, executionTime: data.executionTime ?? 0 }
    return isInfrastructureFailure(result.stderr) ? null : result
  } catch {
    return null
  }
}

export async function execute(language: string, code: string): Promise<ExecResponse> {
  const normalized = language.toLowerCase()
  const startedAt = Date.now()
  const backendLanguage = normalized === "node" || normalized === "javascript" || normalized === "js" ? "node" : normalized === "py" ? "python" : normalized
  const backend = await tryBackend(backendLanguage, code)
  if (backend) return backend
  const piston = await tryPiston(normalized, code)
  if (piston) return piston
  const wandbox = await tryWandbox(normalized, code)
  if (wandbox) return wandbox
  if (normalized === "python" || normalized === "py") {
    const pyodide = await tryPyodide(code)
    if (pyodide) return pyodide
  }
  const label = normalized === "node" || normalized === "javascript" || normalized === "js" ? "Node.js" : language
  return { stdout: "", stderr: `No real ${label} runtime is available. Configure the execution backend or retry when a public provider is online.`, exitCode: 1, executionTime: Date.now() - startedAt }
}
