const BASE = import.meta.env.VITE_API_URL || "/api"
const WS_BASE = import.meta.env.VITE_WS_URL || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws/terminal`

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  error?: string
  sessionId?: string
}

export type WorkspaceFilePayload = { path: string; content: string }

function getDeviceId(): string {
  let id = localStorage.getItem("sk-device-id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("sk-device-id", id)
  }
  return id
}

function getHeaders() {
  return { "Content-Type": "application/json", "X-Device-Id": getDeviceId() }
}

export async function isBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE}/healthz`, { signal: AbortSignal.timeout(3000), headers: getHeaders() })
    if (!response.ok) return false
    const data = await response.json() as { status?: string }
    return data.status === "ok"
  } catch {
    return false
  }
}

export async function runOnBackend(language: string, code: string, opts?: { sessionId?: string }): Promise<ExecResult> {
  try {
    const response = await fetch(`${BASE}/execute`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ language, code, ...opts }),
      signal: AbortSignal.timeout(125000),
    })
    const data = await response.json().catch(() => null) as ExecResult | null
    return data ?? { stdout: "", stderr: response.statusText, exitCode: 1, executionTime: 0, error: response.statusText }
  } catch (error) {
    return { stdout: "", stderr: String(error), exitCode: 1, executionTime: 0, error: String(error) }
  }
}

export async function syncWorkspaceFiles(sessionId: string, files: WorkspaceFilePayload[]) {
  const response = await fetch(`${BASE}/execute/sessions/${encodeURIComponent(sessionId)}/files`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ files }),
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => ({ error: response.statusText })) as { error?: string }).error || response.statusText)
}

export interface RuntimeInfo { name: string; available: boolean }

export async function getAvailableRuntimes(): Promise<RuntimeInfo[]> {
  try {
    const response = await fetch(`${BASE}/execute/runtimes`, { signal: AbortSignal.timeout(5000), headers: getHeaders() })
    if (!response.ok) return []
    return ((await response.json()) as { runtimes?: RuntimeInfo[] }).runtimes ?? []
  } catch {
    return []
  }
}

export type TerminalSocketHandlers = {
  onReady: (sessionId: string) => void
  onStdout: (data: string) => void
  onStderr: (data: string) => void
  onExit: (code: number) => void
  onError: (error: string) => void
}

export function createTerminalWebSocket(handlers: TerminalSocketHandlers) {
  const ws = new WebSocket(WS_BASE)
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data as string) as { type?: string; data?: string; code?: number; sessionId?: string }
      if (message.type === "ready" && message.sessionId) handlers.onReady(message.sessionId)
      else if (message.type === "stdout") handlers.onStdout(message.data ?? "")
      else if (message.type === "stderr") handlers.onStderr(message.data ?? "")
      else if (message.type === "exit") handlers.onExit(message.code ?? 0)
    } catch {
      handlers.onError("Invalid terminal response.")
    }
  }
  ws.onerror = () => handlers.onError("WebSocket connection failed")
  return {
    sendCommand: (command: string) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "command", command })) },
    close: () => ws.close(),
  }
}
