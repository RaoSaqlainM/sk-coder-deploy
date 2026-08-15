import { Server } from "node:http"
import { WebSocket, WebSocketServer } from "ws"
import { createWorkspaceSession, openInteractiveTerminal, terminateInteractiveTerminal } from "./lib/sessionManager.js"

export function setupTerminalWs(server: Server) {
  const wss = new WebSocketServer({ noServer: true })
  server.on("upgrade", (request, socket, head) => {
    if (new URL(request.url || "/", "http://localhost").pathname !== "/api/ws/terminal") return socket.destroy()
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws))
  })
  wss.on("connection", async (ws: WebSocket) => {
    try {
      const session = await createWorkspaceSession()
      const terminal = await openInteractiveTerminal(session.id,
        (data) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "stdout", data })),
        (data) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "stderr", data })),
        (code) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "exit", code, cwd: "/" })),
      )
      ws.send(JSON.stringify({ type: "ready", cwd: "/", sessionId: session.id }))
      ws.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as { type?: string; command?: string }
          if (message.type === "kill") terminateInteractiveTerminal(terminal)
          if (message.type === "command" && message.command) terminal.stdin.write(`${message.command}\n`)
        } catch {}
      })
      ws.on("close", () => terminateInteractiveTerminal(terminal))
    } catch (error) {
      ws.send(JSON.stringify({ type: "stderr", data: `${error instanceof Error ? error.message : "Terminal unavailable."}\n` }))
      ws.close()
    }
  })
}
