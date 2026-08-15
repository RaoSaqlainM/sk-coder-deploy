export interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  language: string
  compiledCode?: string
  isPreviewable: boolean
  previewType: "html" | "text" | "code" | "json"
}

const PISTON_URL = "https://emkc.org/api/v2/piston"
const WANDBOX_URL = "https://wandbox.org/api/compile.json"

const LANGUAGE_MAP: Record<string, { piston: string; wandbox?: string }> = {
  js: { piston: "javascript", wandbox: "nodejs-head" },
  jsx: { piston: "javascript" },
  ts: { piston: "typescript" },
  tsx: { piston: "typescript" },
  py: { piston: "python3", wandbox: "cpython-head" },
  python: { piston: "python3", wandbox: "cpython-head" },
  cpp: { piston: "cpp", wandbox: "gcc-head" },
  c: { piston: "c", wandbox: "gcc-head" },
  java: { piston: "java", wandbox: "openjdk-head" },
  kt: { piston: "kotlin", wandbox: "kotlin-head" },
  rs: { piston: "rust", wandbox: "rust-head" },
  go: { piston: "go", wandbox: "go-head" },
  rb: { piston: "ruby", wandbox: "ruby-head" },
  php: { piston: "php", wandbox: "php-head" },
  swift: { piston: "swift", wandbox: "swift-head" },
  bash: { piston: "bash", wandbox: "bash" },
  sh: { piston: "bash", wandbox: "bash" },
  r: { piston: "r", wandbox: "r-head" },
  sql: { piston: "sql" },
  html: { piston: "html" },
  css: { piston: "css" },
}

async function executePiston(lang: string, code: string): Promise<ExecutionResult | null> {
  try {
    const langConfig = LANGUAGE_MAP[lang]
    if (!langConfig) return null

    const res = await fetch(`${PISTON_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.piston,
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
      exitCode: run.code ?? 0,
      executionTime: run.time ? (parseFloat(run.time) * 1000) : 0,
      language: lang,
      isPreviewable: ["html", "js", "jsx", "ts", "tsx"].includes(lang),
      previewType: lang === "html" ? "html" : "text",
    }
  } catch {
    return null
  }
}

async function executeWandbox(lang: string, code: string): Promise<ExecutionResult | null> {
  try {
    const langConfig = LANGUAGE_MAP[lang]
    if (!langConfig?.wandbox) return null

    const body: Record<string, string> = {
      compiler: langConfig.wandbox,
      code,
      filename: `main.${lang}`,
    }

    const res = await fetch(WANDBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) return null
    const data = await res.json() as any

    const stdout = data.program_output || data.compiler_output || ""
    const stderr = data.program_error || data.compiler_error || ""

    return {
      stdout,
      stderr,
      exitCode: stderr ? 1 : 0,
      executionTime: 0,
      language: lang,
      isPreviewable: false,
      previewType: "text",
    }
  } catch {
    return null
  }
}

export async function unifiedExecute(
  language: string,
  code: string,
  options?: { useBackendOnly?: boolean; useWandboxOnly?: boolean }
): Promise<ExecutionResult | null> {
  const lang = language.toLowerCase().split(".").pop() || language.toLowerCase()

  if (options?.useWandboxOnly) {
    return await executeWandbox(lang, code)
  }

  const pistonResult = await executePiston(lang, code)
  if (pistonResult) return pistonResult

  if (options?.useBackendOnly) return null

  const wandboxResult = await executeWandbox(lang, code)
  if (wandboxResult) return wandboxResult

  return null
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || ""
}

export function isLanguageSupported(language: string): boolean {
  const ext = getFileExtension(language)
  return ext in LANGUAGE_MAP
}

export function getLanguageLabel(ext: string): string {
  const labels: Record<string, string> = {
    js: "JavaScript",
    jsx: "JavaScript/React",
    ts: "TypeScript",
    tsx: "TypeScript/React",
    py: "Python",
    python: "Python",
    cpp: "C++",
    c: "C",
    java: "Java",
    kt: "Kotlin",
    rs: "Rust",
    go: "Go",
    rb: "Ruby",
    php: "PHP",
    swift: "Swift",
    bash: "Bash",
    sh: "Shell",
    r: "R",
    sql: "SQL",
    html: "HTML",
    css: "CSS",
  }
  return labels[ext.toLowerCase()] || ext.toUpperCase()
}
