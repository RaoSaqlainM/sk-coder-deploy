const BASE = import.meta.env.VITE_API_URL || "/api"
const WS_BASE = import.meta.env.VITE_WS_URL || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  error?: string
}

let _available: boolean | null = null

function getDeviceId(): string {
  let id = localStorage.getItem("sk-device-id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("sk-device-id", id)
  }
  return id
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getDeviceId(),
  }
}

export async function isBackendAvailable(): Promise<boolean> {
  if (_available !== null) return _available
  try {
    const r = await fetch(`${BASE}/healthz`, { signal: AbortSignal.timeout(3000), headers: getHeaders() })
    _available = r.ok
  } catch {
    _available = false
  }
  return _available
}

export function resetAvailability() {
  _available = null
}

export async function runOnBackend(
  language: string,
  code: string,
  opts?: { cwd?: string }
): Promise<ExecResult> {
  try {
    const res = await fetch(`${BASE}/execute`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ language, code, ...opts }),
      signal: AbortSignal.timeout(35000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText)
      return { stdout: "", stderr: body, exitCode: 1, executionTime: 0, error: body }
    }
    return await res.json() as ExecResult
  } catch (e) {
    return { stdout: "", stderr: String(e), exitCode: 1, executionTime: 0, error: String(e) }
  }
}

export interface RuntimeInfo {
  name: string
  available: boolean
}

export async function getAvailableRuntimes(): Promise<RuntimeInfo[]> {
  try {
    const res = await fetch(`${BASE}/execute/runtimes`, { signal: AbortSignal.timeout(5000), headers: getHeaders() })
    if (!res.ok) return []
    const data = await res.json() as { runtimes: RuntimeInfo[] }
    return data.runtimes ?? []
  } catch {
    return []
  }
}

export function createTerminalWebSocket(
  sessionId: string,
  onStdout: (data: string) => void,
  onStderr: (data: string) => void,
  onExit: (code: number) => void,
  onError: (err: string) => void
): { send: (type: string, data?: string) => void; close: () => void } {
  const ws = new WebSocket(WS_BASE, undefined)

  ws.onopen = () => {
    ws.send(JSON.stringify({ sessionId, type: "hello", deviceId: getDeviceId() }))
  }

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string) as {
        sessionId: string; type: string; data?: string; code?: number
      }
      if (msg.sessionId !== sessionId) return
      if (msg.type === "stdout") onStdout(msg.data ?? "")
      else if (msg.type === "stderr") onStderr(msg.data ?? "")
      else if (msg.type === "exit") onExit(msg.code ?? 0)
      else if (msg.type === "error") onError(msg.data ?? "unknown error")
    } catch {}
  }

  ws.onerror = () => onError("WebSocket connection failed")

  return {
    send: (type, data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ sessionId, type, data: data ?? "" }))
    },
    close: () => ws.close(),
  }
}
