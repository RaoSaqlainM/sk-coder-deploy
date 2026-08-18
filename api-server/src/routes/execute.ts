import { Router } from "express"
import { cancelWorkspaceDeletion, createWorkspaceSession, getWorkspaceLifecycle, runCodeInWorkspace, runWorkspaceCommand, scheduleWorkspaceDeletion, syncWorkspaceFiles, updateWorkspaceRetention, workspaceStatus } from "../lib/sessionManager.js"
import type { RetentionMode } from "../lib/workspaceRegistry.js"
import { installedRuntimes } from "../lib/runtimeRegistry.js"

const router = Router()

router.get("/execute/runtimes", async (_req, res) => {
  const status = await workspaceStatus()
  res.json({ runtimes: installedRuntimes.map((runtime) => ({ ...runtime, available: status.ready, tier: "oracle-workspace" })), status })
})

router.post("/execute/sessions", async (req, res) => {
  try {
    const requestedRetention = req.body?.retentionMode
    const retentionMode: RetentionMode = requestedRetention === "four-hours" ? "four-hours" : "three-days"
    const session = await createWorkspaceSession({ retentionMode })
    const lifecycle = await getWorkspaceLifecycle(session.id)
    res.status(201).json({ id: session.id, cwd: "/", expiresAt: lifecycle.expiresAt, retentionMode: lifecycle.retentionMode, quotaBytes: lifecycle.quotaBytes, tier: "oracle-workspace" })
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Session service unavailable." })
  }
})

router.get("/execute/sessions/:id", async (req, res) => {
  try {
    res.json({ ...(await getWorkspaceLifecycle(req.params.id)), tier: "oracle-workspace" })
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." })
  }
})

router.post("/execute/sessions/:id/heartbeat", async (req, res) => {
  try {
    const lifecycle = await updateWorkspaceRetention(req.params.id, req.body?.retentionMode === "four-hours" ? "four-hours" : "three-days")
    res.json({ ...lifecycle, tier: "oracle-workspace" })
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." })
  }
})

router.put("/execute/sessions/:id/retention", async (req, res) => {
  const requestedRetention = req.body?.retentionMode
  if (requestedRetention !== "three-days" && requestedRetention !== "four-hours") return res.status(400).json({ error: "retentionMode must be three-days or four-hours" })
  try {
    res.json({ ...(await updateWorkspaceRetention(req.params.id, requestedRetention)), tier: "oracle-workspace" })
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." })
  }
})

router.post("/execute/sessions/:id/delete", async (req, res) => {
  try {
    res.json({ ...(await scheduleWorkspaceDeletion(req.params.id)), tier: "oracle-workspace" })
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." })
  }
})

router.post("/execute/sessions/:id/cancel-delete", async (req, res) => {
  try {
    res.json({ ...(await cancelWorkspaceDeletion(req.params.id)), tier: "oracle-workspace" })
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." })
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
    res.json({ ...(await runWorkspaceCommand(req.params.id, command, cwd || "/")), tier: "oracle-workspace" })
  } catch (error) {
    res.status(400).json({ stdout: "", stderr: error instanceof Error ? error.message : "Command failed.", exitCode: 1, executionTime: 0, tier: "oracle-workspace" })
  }
})

router.post("/execute", async (req, res) => {
  const { language, code, sessionId } = req.body as { language?: string; code?: string; sessionId?: string }
  if (!language || code === undefined) return res.status(400).json({ error: "language and code are required" })
  try {
    const session = sessionId ? { id: sessionId } : await createWorkspaceSession()
    res.json({ ...(await runCodeInWorkspace(session.id, language, code)), sessionId: session.id, tier: "oracle-workspace" })
  } catch (error) {
    res.status(503).json({ stdout: "", stderr: error instanceof Error ? error.message : "Execution service unavailable.", exitCode: 1, executionTime: 0, error: "runtime-unavailable", tier: "unavailable" })
  }
})

export default router
