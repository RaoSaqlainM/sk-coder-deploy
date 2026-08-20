import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { getWorkspaceLifecycle, scheduleWorkspaceDeletion, workspaceStatus } from "../lib/sessionManager.js";
import { listWorkspaceRecords } from "../lib/workspaceRegistry.js";
const router = Router();
function isAuthorized(value: unknown) {
    const expected = process.env["ADMIN_DASHBOARD_TOKEN"];
    if (!expected || typeof value !== "string")
        return false;
    const left = Buffer.from(value);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
}
router.use((req, res, next) => {
    if (!process.env["ADMIN_DASHBOARD_TOKEN"])
        return res.status(404).json({ error: "Administrator dashboard is not configured." });
    if (!isAuthorized(req.header("x-sk-admin-token")))
        return res.status(401).json({ error: "Administrator authorization required." });
    next();
});
router.get("/admin/summary", async (_req, res) => {
    const [status, records] = await Promise.all([workspaceStatus(), listWorkspaceRecords()]);
    const active = records.filter((record) => record.state === "active");
    const scheduledDelete = records.filter((record) => record.state === "scheduled-delete");
    res.json({
        generatedAt: Date.now(),
        capacity: status.capacity,
        activeRuntimeSessions: status.activeSessions,
        workspaces: {
            total: records.length,
            active: active.length,
            scheduledDelete: scheduledDelete.length,
            deleted: records.filter((record) => record.state === "deleted").length,
            retainedQuotaBytes: active.reduce((total, record) => total + record.quotaBytes, 0),
        },
    });
});
router.get("/admin/workspaces", async (_req, res) => {
    const records = await listWorkspaceRecords();
    res.json({
        workspaces: records.map((record) => ({
            id: record.id,
            createdAt: record.createdAt,
            lastHeartbeatAt: record.lastHeartbeatAt,
            expiresAt: record.expiresAt,
            state: record.state,
            quotaBytes: record.quotaBytes,
            revision: record.revision,
        })),
    });
});
router.post("/admin/workspaces/:id/schedule-delete", async (req, res) => {
    const id = req.params.id;
    if (req.body?.confirmWorkspaceId !== id)
        return res.status(400).json({ error: "Confirm the exact workspace ID before scheduling deletion." });
    const record = await getWorkspaceLifecycle(id).catch(() => null);
    if (!record || record.state !== "active")
        return res.status(404).json({ error: "Active workspace not found." });
    if (Date.now() - record.lastHeartbeatAt < 15 * 60 * 1000)
        return res.status(409).json({ error: "Workspace is recently active and cannot be scheduled for administrator cleanup." });
    const lifecycle = await scheduleWorkspaceDeletion(id);
    res.json({ lifecycle, message: "Inactive workspace is scheduled for deletion in four hours and can still be undone by its user." });
});
export default router;
