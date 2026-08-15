import { ChildProcess, spawn } from "node:child_process"
import { chmod, mkdir, rm, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { dirname, join, normalize, relative, resolve } from "node:path"
import { COMMAND_TIMEOUT_MS, RUNTIME_IMAGE, SESSION_MAX_BYTES, SESSION_MAX_COUNT, SESSION_TTL_HOURS, WORKSPACE_MAX_BYTES, WORKSPACE_ROOT } from "./backendConfig.js"

export type CommandResult = { stdout: string; stderr: string; exitCode: number; executionTime: number }
export type WorkspaceSession = { id: string; containerName: string; workspacePath: string; createdAt: number; lastUsedAt: number }
export type WorkspaceFile = { path: string; content: string }

const sessions = new Map<string, WorkspaceSession>()
let dockerReady: boolean | null = null
let cleanupStarted = false

function run(command: string, args: string[], timeout = COMMAND_TIMEOUT_MS): Promise<CommandResult> {
  return new Promise((resolveResult) => {
    const startedAt = Date.now()
    const proc = spawn(command, args, { env: { ...process.env, NO_COLOR: "1" } })
    let stdout = ""
    let stderr = ""
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      proc.kill("SIGTERM")
      setTimeout(() => proc.kill("SIGKILL"), 1000).unref()
    }, timeout)
    proc.stdout.on("data", (value: Buffer) => { stdout += value.toString() })
    proc.stderr.on("data", (value: Buffer) => { stderr += value.toString() })
    proc.once("error", (error) => {
      clearTimeout(timer)
      resolveResult({ stdout: "", stderr: error.message, exitCode: 127, executionTime: Date.now() - startedAt })
    })
    proc.once("close", (code) => {
      clearTimeout(timer)
      resolveResult({ stdout: stdout.slice(0, 500000), stderr: `${stderr}${timedOut ? "\nCommand timed out." : ""}`.trim(), exitCode: code ?? 1, executionTime: Date.now() - startedAt })
    })
  })
}

function safeRelativePath(pathname: string) {
  const value = normalize(pathname.trim().replace(/^\/+/, "") || ".")
  if (value === ".." || value.startsWith("..\\") || value.startsWith("../")) throw new Error("Workspace path escapes the session root.")
  return value
}

async function checkSize(pathname: string, limit: number, message: string) {
  const result = await run("du", ["-sb", pathname], 5000)
  const bytes = Number(result.stdout.split(/\s+/)[0])
  if (Number.isFinite(bytes) && bytes >= limit) throw new Error(message)
}

export async function ensureDockerReady() {
  if (dockerReady !== null) return dockerReady
  const result = await run("docker", ["version", "--format", "{{.Server.Version}}"], 5000)
  dockerReady = result.exitCode === 0 && Boolean(result.stdout.trim())
  return dockerReady
}

export async function createWorkspaceSession() {
  if (!(await ensureDockerReady())) throw new Error("The isolated runtime service is not available.")
  if (sessions.size >= SESSION_MAX_COUNT) throw new Error("The server has reached its active workspace limit.")
  await mkdir(WORKSPACE_ROOT, { recursive: true, mode: 0o700 })
  await checkSize(WORKSPACE_ROOT, WORKSPACE_MAX_BYTES, "Server workspace capacity reached. Use browser storage or public execution fallback.")
  const id = randomUUID()
  const workspacePath = resolve(WORKSPACE_ROOT, id)
  const containerName = `skcoder-${id.replaceAll("-", "")}`
  await mkdir(workspacePath, { recursive: true, mode: 0o777 })
  await chmod(workspacePath, 0o777)
  const result = await run("docker", [
    "run", "-d", "--rm", "--name", containerName, "--network", "none", "--memory", "1024m", "--memory-swap", "1024m", "--cpus", "1", "--pids-limit", "256",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--user", "1000:1000", "-v", `${workspacePath}:/workspace:rw`, "-w", "/workspace", "--tmpfs", "/tmp:rw,size=256m,mode=1777",
    RUNTIME_IMAGE, "sleep", "infinity",
  ], 30000)
  if (result.exitCode !== 0) {
    await rm(workspacePath, { recursive: true, force: true })
    throw new Error(result.stderr || "The isolated runtime could not start.")
  }
  const session = { id, containerName, workspacePath, createdAt: Date.now(), lastUsedAt: Date.now() }
  sessions.set(id, session)
  startCleanup()
  return session
}

export async function getWorkspaceSession(id: string) {
  const session = sessions.get(id)
  if (!session) throw new Error("Workspace session not found or expired.")
  session.lastUsedAt = Date.now()
  return session
}

export async function syncWorkspaceFiles(id: string, files: WorkspaceFile[]) {
  const session = await getWorkspaceSession(id)
  if (files.length > 1000) throw new Error("Workspace file limit reached.")
  for (const file of files) {
    if (typeof file.path !== "string" || typeof file.content !== "string" || file.content.length > 2_000_000) throw new Error("Invalid workspace file payload.")
    const requested = safeRelativePath(file.path)
    if (requested === ".") throw new Error("A workspace file path is required.")
    const target = resolve(session.workspacePath, requested)
    if (relative(session.workspacePath, target).startsWith("..")) throw new Error("Workspace path escapes the session root.")
    await mkdir(dirname(target), { recursive: true, mode: 0o777 })
    await writeFile(target, file.content, "utf8")
  }
  await checkSize(session.workspacePath, SESSION_MAX_BYTES, "Workspace storage limit reached.")
}

export async function runWorkspaceCommand(id: string, command: string, cwd = "/") {
  const session = await getWorkspaceSession(id)
  const requested = safeRelativePath(cwd)
  const workspaceCwd = requested === "." ? "/workspace" : `/workspace/${requested.replaceAll("\\", "/")}`
  const result = await run("docker", ["exec", "-i", "-w", workspaceCwd, session.containerName, "bash", "-lc", command])
  await checkSize(session.workspacePath, SESSION_MAX_BYTES, "Workspace storage limit reached.")
  return result
}

export async function runCodeInWorkspace(id: string, language: string, code: string) {
  const session = await getWorkspaceSession(id)
  const runPath = `.skcoder-runs/${randomUUID()}`
  const hostRunPath = resolve(session.workspacePath, runPath)
  const config: Record<string, { filename: string; command: string }> = {
    python: { filename: "main.py", command: "python3 main.py" }, py: { filename: "main.py", command: "python3 main.py" },
    node: { filename: "main.js", command: "node main.js" }, nodejs: { filename: "main.js", command: "node main.js" }, javascript: { filename: "main.js", command: "node main.js" }, js: { filename: "main.js", command: "node main.js" }, mjs: { filename: "main.mjs", command: "node main.mjs" }, cjs: { filename: "main.cjs", command: "node main.cjs" },
    typescript: { filename: "main.ts", command: "tsx main.ts" }, ts: { filename: "main.ts", command: "tsx main.ts" }, tsx: { filename: "main.tsx", command: "tsx main.tsx" },
    bash: { filename: "main.sh", command: "bash main.sh" }, shell: { filename: "main.sh", command: "bash main.sh" },
    java: { filename: "Main.java", command: "javac Main.java && java Main" }, c: { filename: "main.c", command: "gcc main.c -O2 -o main && ./main" }, cpp: { filename: "main.cpp", command: "g++ main.cpp -O2 -o main && ./main" },
    cc: { filename: "main.cpp", command: "g++ main.cpp -O2 -o main && ./main" }, kotlin: { filename: "Main.kt", command: "kotlinc Main.kt -include-runtime -d main.jar && java -jar main.jar" }, kt: { filename: "Main.kt", command: "kotlinc Main.kt -include-runtime -d main.jar && java -jar main.jar" },
    rust: { filename: "main.rs", command: "rustc main.rs -O -o main && ./main" }, rs: { filename: "main.rs", command: "rustc main.rs -O -o main && ./main" }, go: { filename: "main.go", command: "go run main.go" }, php: { filename: "main.php", command: "php main.php" }, ruby: { filename: "main.rb", command: "ruby main.rb" }, rb: { filename: "main.rb", command: "ruby main.rb" },
  }
  const selected = config[language.toLowerCase()]
  if (!selected) throw new Error(`Unsupported runtime: ${language}`)
  await mkdir(hostRunPath, { recursive: true, mode: 0o777 })
  await writeFile(join(hostRunPath, selected.filename), code, "utf8")
  try {
    return await runWorkspaceCommand(id, selected.command, runPath)
  } finally {
    await rm(hostRunPath, { recursive: true, force: true })
  }
}

export async function openInteractiveTerminal(id: string, onStdout: (value: string) => void, onStderr: (value: string) => void, onClose: (code: number) => void) {
  const session = await getWorkspaceSession(id)
  const proc = spawn("docker", ["exec", "-i", "-w", "/workspace", session.containerName, "bash", "--noprofile", "--norc"], { env: { ...process.env, TERM: "xterm-256color", HOME: "/workspace" } })
  proc.stdout.on("data", (value: Buffer) => onStdout(value.toString()))
  proc.stderr.on("data", (value: Buffer) => onStderr(value.toString()))
  proc.once("close", (code) => onClose(code ?? 1))
  return proc
}

export function terminateInteractiveTerminal(proc: ChildProcess) {
  proc.kill("SIGTERM")
  setTimeout(() => proc.kill("SIGKILL"), 1000).unref()
}

export async function workspaceStatus() {
  return { ready: await ensureDockerReady(), activeSessions: sessions.size, image: RUNTIME_IMAGE }
}

async function closeWorkspaceSession(id: string) {
  const session = sessions.get(id)
  if (!session) return
  sessions.delete(id)
  await run("docker", ["rm", "-f", session.containerName], 10000)
  await rm(session.workspacePath, { recursive: true, force: true })
}

function startCleanup() {
  if (cleanupStarted) return
  cleanupStarted = true
  const timer = setInterval(async () => {
    const cutoff = Date.now() - SESSION_TTL_HOURS * 60 * 60 * 1000
    for (const session of sessions.values()) if (session.lastUsedAt < cutoff) await closeWorkspaceSession(session.id)
  }, 60 * 60 * 1000)
  timer.unref()
}
