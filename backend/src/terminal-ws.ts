import { IncomingMessage, Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { createWorkspaceSession, getWorkspaceSession, openInteractiveTerminal, terminateInteractiveTerminal } from "./lib/sessionManager.js";
import { isAllowedOrigin } from "./lib/originPolicy.js";
export function setupTerminalWs(server: Server) {
    const wss = new WebSocketServer({ noServer: true });
    server.on("upgrade", (request, socket, head) => {
        if (new URL(request.url || "/", "http://localhost").pathname !== "/api/ws/terminal")
            return socket.destroy();
        if (!isAllowedOrigin(request.headers.origin)) {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            return socket.destroy();
        }
        wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
    });
    wss.on("connection", async (ws: WebSocket, request: IncomingMessage) => {
        try {
            const requestedSessionId = new URL(request.url || "/", "http://localhost").searchParams.get("sessionId");
            let session;
            try {
                session = requestedSessionId ? await getWorkspaceSession(requestedSessionId) : await createWorkspaceSession();
            }
            catch {
                session = await createWorkspaceSession();
            }
            const terminal = await openInteractiveTerminal(session.id, (data) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "stdout", data })), (data) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "stderr", data })), (code) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "exit", code, cwd: "/" })));
            ws.send(JSON.stringify({ type: "ready", cwd: "/", sessionId: session.id }));
            ws.on("message", (raw) => {
                try {
                    const message = JSON.parse(raw.toString()) as {
                        type?: string;
                        command?: string;
                        data?: string;
                    };
                    if (message.type === "kill")
                        terminateInteractiveTerminal(terminal);
                    if (message.type === "command" && message.command)
                        terminal.stdin.write(`${message.command}\n`);
                    if (message.type === "input" && typeof message.data === "string" && message.data.length <= 65536)
                        terminal.stdin.write(message.data);
                    if (message.type === "interrupt")
                        terminal.stdin.write("\u0003");
                }
                catch { }
            });
            ws.on("close", () => terminateInteractiveTerminal(terminal));
        }
        catch (error) {
            ws.send(JSON.stringify({ type: "stderr", data: `${error instanceof Error ? error.message : "Terminal unavailable."}\n` }));
            ws.close();
        }
    });
}
