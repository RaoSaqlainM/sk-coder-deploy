import { createServer } from "node:http"
import app from "./app.js"
import { logger } from "./lib/logger.js"
import { setupTerminalWs } from "./terminal-ws.js"

const port = Number(process.env["PORT"] || 3001)
if (!Number.isFinite(port) || port <= 0) throw new Error("PORT must be a positive number.")

const server = createServer(app)
setupTerminalWs(server)
server.listen(port, () => logger.info({ port }, "Server listening"))
