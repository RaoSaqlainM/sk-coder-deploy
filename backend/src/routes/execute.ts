import express, { Router } from "express";
import { beginWorkspaceStage, cancelWorkspaceDeletion, commitWorkspaceStage, createWorkspaceSession, getWorkspaceLifecycle, getWorkspaceStageStatus, recordWorkspaceActivity, removeWorkspaceStage, runCodeInWorkspace, runEphemeralCode, runWorkspaceCommand, scheduleWorkspaceDeletion, syncWorkspaceFiles, updateWorkspaceRetention, workspaceStatus, writeWorkspaceStageChunk } from "../lib/sessionManager.js";
import type { RetentionMode } from "../lib/workspaceRegistry.js";
import { installedRuntimes } from "../lib/runtimeRegistry.js";
const router = Router();
router.get("/execute/runtimes", async (_req, res) => {
    const status = await workspaceStatus();
    res.json({ runtimes: installedRuntimes.map((runtime) => ({ ...runtime, available: status.ready, tier: "oracle-workspace" })), status });
});
router.post("/execute/sessions", async (req, res) => {
    try {
        const requestedRetention = req.body?.retentionMode;
        const retentionMode: RetentionMode = requestedRetention === "four-hours" ? "four-hours" : "three-days";
        const session = await createWorkspaceSession({ retentionMode });
        const lifecycle = await getWorkspaceLifecycle(session.id);
        res.status(201).json({ id: session.id, cwd: "/", expiresAt: lifecycle.expiresAt, retentionMode: lifecycle.retentionMode, quotaBytes: lifecycle.quotaBytes, tier: "oracle-workspace" });
    }
    catch (error) {
        res.status(503).json({ error: error instanceof Error ? error.message : "Session service unavailable." });
    }
});
router.get("/execute/sessions/:id", async (req, res) => {
    try {
        res.json({ ...(await getWorkspaceLifecycle(req.params.id)), tier: "oracle-workspace" });
    }
    catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." });
    }
});
router.post("/execute/sessions/:id/heartbeat", async (req, res) => {
    try {
        const lifecycle = await recordWorkspaceActivity(req.params.id);
        res.json({ ...lifecycle, tier: "oracle-workspace" });
    }
    catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." });
    }
});
router.put("/execute/sessions/:id/retention", async (req, res) => {
    const requestedRetention = req.body?.retentionMode;
    if (requestedRetention !== "three-days")
        return res.status(400).json({ error: "retentionMode must be three-days" });
    try {
        res.json({ ...(await updateWorkspaceRetention(req.params.id, requestedRetention)), tier: "oracle-workspace" });
    }
    catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." });
    }
});
router.post("/execute/sessions/:id/delete", async (req, res) => {
    try {
        res.json({ ...(await scheduleWorkspaceDeletion(req.params.id)), tier: "oracle-workspace" });
    }
    catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." });
    }
});
router.post("/execute/sessions/:id/cancel-delete", async (req, res) => {
    try {
        res.json({ ...(await cancelWorkspaceDeletion(req.params.id)), tier: "oracle-workspace" });
    }
    catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : "Workspace session not found." });
    }
});
router.post("/execute/sessions/:id/files", async (req, res) => {
    const files = req.body?.files;
    if (!Array.isArray(files))
        return res.status(400).json({ error: "files must be an array" });
    try {
        await syncWorkspaceFiles(req.params.id, files.map((file: unknown) => {
            const item = file as {
                path?: unknown;
                content?: unknown;
                encoding?: unknown;
            };
            return { path: String(item.path ?? ""), content: String(item.content ?? ""), encoding: item.encoding === "base64" ? "base64" as const : "utf8" as const };
        }));
        res.status(204).end();
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Workspace synchronization failed." });
    }
});
router.post("/execute/sessions/:id/stage/manifest", async (req, res) => {
    const files = req.body?.files;
    if (!Array.isArray(files))
        return res.status(400).json({ error: "files must be an array" });
    try {
        res.status(201).json(await beginWorkspaceStage(req.params.id, files, typeof req.body?.stageId === "string" ? req.body.stageId : undefined));
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Unable to create staging session." });
    }
});
router.get("/execute/sessions/:id/stage/:stageId", async (req, res) => {
    try {
        res.json(await getWorkspaceStageStatus(req.params.id, req.params.stageId));
    }
    catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : "Staging session not found." });
    }
});
router.put("/execute/sessions/:id/stage/:stageId/chunk", express.raw({ type: "application/octet-stream", limit: "8mb" }), async (req, res) => {
    const path = req.header("x-stage-path");
    const offset = Number(req.header("x-stage-offset"));
    if (!path || !Number.isSafeInteger(offset) || !Buffer.isBuffer(req.body))
        return res.status(400).json({ error: "Binary body, x-stage-path, and x-stage-offset are required." });
    try {
        res.status(201).json(await writeWorkspaceStageChunk(req.params.id, req.params.stageId, path, offset, req.body, req.header("x-stage-checksum") ?? undefined));
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Chunk transfer failed." });
    }
});
router.post("/execute/sessions/:id/stage/:stageId/commit", async (req, res) => {
    try {
        res.json(await commitWorkspaceStage(req.params.id, req.params.stageId));
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Staging commit failed." });
    }
});
router.delete("/execute/sessions/:id/stage/:stageId", async (req, res) => {
    try {
        await removeWorkspaceStage(req.params.id, req.params.stageId);
        res.status(204).end();
    }
    catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : "Staging session not found." });
    }
});
router.post("/execute/sessions/:id/command", async (req, res) => {
    const { command, cwd } = req.body as {
        command?: string;
        cwd?: string;
    };
    if (!command?.trim())
        return res.status(400).json({ error: "command is required" });
    try {
        res.json({ ...(await runWorkspaceCommand(req.params.id, command, cwd || "/")), tier: "oracle-workspace" });
    }
    catch (error) {
        res.status(400).json({ stdout: "", stderr: error instanceof Error ? error.message : "Command failed.", exitCode: 1, executionTime: 0, tier: "oracle-workspace" });
    }
});
router.post("/execute", async (req, res) => {
    const { language, code, sessionId, stdin } = req.body as {
        language?: string;
        code?: string;
        sessionId?: string;
        stdin?: string;
    };
    if (!language || code === undefined)
        return res.status(400).json({ error: "language and code are required" });
    try {
        const result = sessionId
            ? await runCodeInWorkspace(sessionId, language, code, typeof stdin === "string" ? stdin : "")
            : await runEphemeralCode(language, code, typeof stdin === "string" ? stdin : "");
        res.json({ ...result, ...(sessionId ? { sessionId } : {}), tier: "oracle-workspace" });
    }
    catch (error) {
        res.status(503).json({ stdout: "", stderr: error instanceof Error ? error.message : "Execution service unavailable.", exitCode: 1, executionTime: 0, error: "runtime-unavailable", tier: "unavailable" });
    }
});
export default router;
