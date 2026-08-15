import { Router } from "express"
import { createWorkspaceSession, runCodeInWorkspace, runWorkspaceCommand, syncWorkspaceFiles, workspaceStatus } from "../lib/sessionManager.js"

const router = Router()

router.get("/execute/runtimes", async (_req, res) => {
  const status = await workspaceStatus()
  res.json({ runtimes: ["node", "python", "bash", "java", "c", "cpp", "rust", "go"].map((name) => ({ name, available: status.ready })), status })
})

router.post("/execute/sessions", async (_req, res) => {
  try {
    const session = await createWorkspaceSession()
    res.status(201).json({ id: session.id, cwd: "/", expiresInHours: 72 })
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Session service unavailable." })
  }
})

router.post("/execute/sessions/:id/files", async (req, res) => {
  const files = req.body?.files
  if (!Array.isArray(files)) return res.status(400).json({ error: "files must be an array" })
  try {
    await syncWorkspaceFiles(req.params.id, files.map((file: unknown) => {
      const item = file as { path?: unknown; content?: unknown }
      return { path: String(item.path ?? ""), content: String(item.content ?? "") }
    }))
    res.status(204).end()
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Workspace synchronization failed." })
  }
})

router.post("/execute/sessions/:id/command", async (req, res) => {
  const { command, cwd } = req.body as { command?: string; cwd?: string }
  if (!command?.trim()) return res.status(400).json({ error: "command is required" })
  try {
    res.json(await runWorkspaceCommand(req.params.id, command, cwd || "/"))
  } catch (error) {
    res.status(400).json({ stdout: "", stderr: error instanceof Error ? error.message : "Command failed.", exitCode: 1, executionTime: 0 })
  }
})

router.post("/execute", async (req, res) => {
  const { language, code, sessionId } = req.body as { language?: string; code?: string; sessionId?: string }
  if (!language || code === undefined) return res.status(400).json({ error: "language and code are required" })
  try {
    const session = sessionId ? { id: sessionId } : await createWorkspaceSession()
    res.json({ ...(await runCodeInWorkspace(session.id, language, code)), sessionId: session.id })
  } catch (error) {
    res.status(503).json({ stdout: "", stderr: error instanceof Error ? error.message : "Execution service unavailable.", exitCode: 1, executionTime: 0, error: "runtime-unavailable" })
  }
})

export default router
