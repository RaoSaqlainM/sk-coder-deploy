import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { WORKSPACE_METADATA_PATH } from "./backendConfig.js";
export type RetentionMode = "three-days" | "four-hours";
export type WorkspaceRecord = {
    id: string;
    createdAt: number;
    lastHeartbeatAt: number;
    expiresAt: number;
    retentionMode: RetentionMode;
    quotaBytes: number;
    state: "active" | "scheduled-delete" | "deleted";
    deleteUndoUntil: number | null;
    revision: number;
};
type WorkspaceRegistry = {
    version: 1;
    records: WorkspaceRecord[];
};
let registryCache: WorkspaceRegistry | null = null;
let writeQueue = Promise.resolve();
function defaultRegistry(): WorkspaceRegistry {
    return { version: 1, records: [] };
}
async function readRegistry(): Promise<WorkspaceRegistry> {
    if (registryCache)
        return registryCache;
    try {
        const parsed = JSON.parse(await readFile(WORKSPACE_METADATA_PATH, "utf8")) as WorkspaceRegistry;
        registryCache = parsed?.version === 1 && Array.isArray(parsed.records) ? parsed : defaultRegistry();
    }
    catch {
        registryCache = defaultRegistry();
    }
    return registryCache;
}
async function persistRegistry() {
    const registry = await readRegistry();
    await mkdir(dirname(WORKSPACE_METADATA_PATH), { recursive: true, mode: 0o700 });
    const temporaryPath = join(dirname(WORKSPACE_METADATA_PATH), `.workspaces-${randomUUID()}.json`);
    await writeFile(temporaryPath, JSON.stringify(registry), { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, WORKSPACE_METADATA_PATH);
}
function queuePersist() {
    writeQueue = writeQueue.then(() => persistRegistry());
    return writeQueue;
}
export async function createWorkspaceRecord(id: string, quotaBytes: number, retentionMode: RetentionMode = "three-days") {
    const registry = await readRegistry();
    const now = Date.now();
    const duration = retentionMode === "four-hours" ? 4 : 72;
    const record: WorkspaceRecord = {
        id,
        createdAt: now,
        lastHeartbeatAt: now,
        expiresAt: now + duration * 60 * 60 * 1000,
        retentionMode,
        quotaBytes,
        state: "active",
        deleteUndoUntil: null,
        revision: 0,
    };
    registry.records = [...registry.records.filter((item) => item.id !== id), record];
    await queuePersist();
    return record;
}
export async function getWorkspaceRecord(id: string) {
    return (await readRegistry()).records.find((item) => item.id === id) ?? null;
}
export async function touchWorkspaceRecord(id: string) {
    const registry = await readRegistry();
    const record = registry.records.find((item) => item.id === id);
    if (!record)
        return null;
    const now = Date.now();
    const duration = record.retentionMode === "four-hours" ? 4 : 72;
    record.lastHeartbeatAt = now;
    record.expiresAt = now + duration * 60 * 60 * 1000;
    record.state = "active";
    await queuePersist();
    return record;
}
export async function setWorkspaceRetention(id: string, retentionMode: RetentionMode) {
    const registry = await readRegistry();
    const record = registry.records.find((item) => item.id === id);
    if (!record)
        return null;
    const now = Date.now();
    const duration = retentionMode === "four-hours" ? 4 : 72;
    record.retentionMode = retentionMode;
    record.lastHeartbeatAt = now;
    record.expiresAt = now + duration * 60 * 60 * 1000;
    record.state = retentionMode === "four-hours" ? "scheduled-delete" : "active";
    await queuePersist();
    return record;
}
export async function scheduleWorkspaceDelete(id: string, undoMinutes = 60) {
    const registry = await readRegistry();
    const record = registry.records.find((item) => item.id === id);
    if (!record)
        return null;
    const now = Date.now();
    record.state = "scheduled-delete";
    record.expiresAt = now + undoMinutes * 60 * 1000;
    record.deleteUndoUntil = record.expiresAt;
    await queuePersist();
    return record;
}
export async function cancelWorkspaceDelete(id: string) {
    const registry = await readRegistry();
    const record = registry.records.find((item) => item.id === id);
    if (!record)
        return null;
    const now = Date.now();
    record.state = "active";
    record.deleteUndoUntil = null;
    record.lastHeartbeatAt = now;
    record.expiresAt = now + (record.retentionMode === "four-hours" ? 4 : 72) * 60 * 60 * 1000;
    await queuePersist();
    return record;
}
export async function incrementWorkspaceRevision(id: string) {
    const registry = await readRegistry();
    const record = registry.records.find((item) => item.id === id);
    if (!record)
        return null;
    record.revision += 1;
    await queuePersist();
    return record;
}
export async function markWorkspaceDeleted(id: string) {
    const registry = await readRegistry();
    const record = registry.records.find((item) => item.id === id);
    if (!record)
        return null;
    record.state = "deleted";
    record.deleteUndoUntil = null;
    await queuePersist();
    return record;
}
export async function listExpiredWorkspaceRecords(now = Date.now()) {
    return (await readRegistry()).records.filter((record) => record.state !== "deleted" && record.expiresAt <= now);
}
export async function listScheduledWorkspaceRecords() {
    return (await readRegistry()).records.filter((record) => record.state === "scheduled-delete");
}
