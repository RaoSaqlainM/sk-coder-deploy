import { runOnBackend, ExecResult } from "./backendRunner"

const PISTON_URL = import.meta.env.VITE_PISTON_URL || "https://emkc.org/api/v2/piston"
const WANDBOX_URL = import.meta.env.VITE_WANDBOX_URL || "https://wandbox.org/api/compile.json"
const ENABLE_WANDBOX = import.meta.env.VITE_ENABLE_WANDBOX !== "false"
const ENABLE_PISTON = import.meta.env.VITE_ENABLE_PISTON !== "false"

interface ExecutorResult {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  executor: string
}

const WANDBOX_LANG_MAP: Record<string, string> = {
  javascript: "node-head",
  js: "node-head",
  java: "openjdk-head",
  python: "python3-head",
  python3: "python3-head",
  cpp: "gcc-head",
  c: "gcc-head",
  rust: "rust-head",
  go: "go-head",
  ruby: "ruby-head",
  php: "php-head",
}

async function executePiston(language: string, code: string): Promise<ExecutorResult | null> {
  if (!ENABLE_PISTON) return null

  try {
    const res = await fetch(`${PISTON_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        version: "*",
        files: [{ name: "main", content: code }],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return null

    const data = await res.json() as any
    const run = data.run || {}

    return {
      stdout: run.stdout || "",
      stderr: run.stderr || "",
      exitCode: run.code || 0,
      executionTime: run.time || 0,
      executor: "piston",
    }
  } catch {
    return null
  }
}

async function executeWandbox(language: string, code: string): Promise<ExecutorResult | null> {
  if (!ENABLE_WANDBOX) return null

  const wandboxLang = WANDBOX_LANG_MAP[language.toLowerCase()]
  if (!wandboxLang) return null

  try {
    const res = await fetch(WANDBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: wandboxLang,
        code,
        save: false,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return null

    const data = await res.json() as any

    return {
      stdout: data.program_output || "",
      stderr: data.compiler_error || data.program_error || "",
      exitCode: data.status === 0 ? 0 : 1,
      executionTime: 0,
      executor: "wandbox",
    }
  } catch {
    return null
  }
}

export async function executeCode(language: string, code: string): Promise<ExecutorResult> {
  const startTime = performance.now()
  const isNodeOrJava = language.toLowerCase() === "javascript" || language.toLowerCase() === "js" || language.toLowerCase() === "java"

  if (isNodeOrJava) {
    const wandboxResult = await executeWandbox(language, code)
    if (wandboxResult) return wandboxResult
  }

  try {
    const result = await runOnBackend(language, code)
    if (!result.error) {
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime: result.executionTime || Math.round(performance.now() - startTime),
        executor: "backend",
      }
    }
  } catch {}

  const pistonResult = await executePiston(language, code)
  if (pistonResult) return pistonResult

  if (!isNodeOrJava) {
    const wandboxResult = await executeWandbox(language, code)
    if (wandboxResult) return wandboxResult
  }

  return {
    stdout: "",
    stderr: "No executor available for this language",
    exitCode: 1,
    executionTime: Math.round(performance.now() - startTime),
    executor: "none",
  }
}
