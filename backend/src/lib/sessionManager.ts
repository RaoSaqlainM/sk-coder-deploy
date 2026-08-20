import { spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdir, open, rename, rm, stat, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { COMMAND_TIMEOUT_MS, RUNTIME_IMAGE, SESSION_MAX_BYTES, SESSION_MAX_COUNT, SESSION_TTL_HOURS, WORKSPACE_MAX_BYTES, WORKSPACE_ROOT, WORKSPACE_SAFETY_RESERVE_BYTES } from "./backendConfig.js";
import { cancelWorkspaceDelete, createWorkspaceRecord, getWorkspaceRecord, incrementWorkspaceRevision, listExpiredWorkspaceRecords, listScheduledWorkspaceRecords, markWorkspaceDeleted, scheduleWorkspaceDelete, setWorkspaceRetention, touchWorkspaceRecord, type RetentionMode } from "./workspaceRegistry.js";
export type CommandResult = {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
};
export type WorkspaceSession = {
    id: string;
    containerName: string;
    workspacePath: string;
    createdAt: number;
    lastUsedAt: number;
    retentionMode: RetentionMode;
};
export type WorkspaceFile = {
    path: string;
    content: string;
    encoding?: "utf8" | "base64";
};
export type WorkspaceStageFile = {
    path: string;
    size: number;
    sha256?: string;
    revision?: string;
};
type WorkspaceStage = {
    id: string;
    sessionId: string;
    rootPath: string;
    files: Map<string, WorkspaceStageFile>;
    completedOffsets: Map<string, Set<number>>;
};
const STAGE_CHUNK_BYTES = 4 * 1024 * 1024;
const sessions = new Map<string, WorkspaceSession>();
const stages = new Map<string, WorkspaceStage>();
let dockerReady: boolean | null = null;
let cleanupStarted = false;
function run(command: string, args: string[], timeout = COMMAND_TIMEOUT_MS, stdin = ""): Promise<CommandResult> {
    return new Promise((resolveResult) => {
        const startedAt = Date.now();
        const proc = spawn(command, args, { env: { ...process.env, NO_COLOR: "1" } });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        proc.stdin.on("error", () => undefined);
        const timer = setTimeout(() => {
            timedOut = true;
            proc.kill("SIGTERM");
            setTimeout(() => proc.kill("SIGKILL"), 1000).unref();
        }, timeout);
        proc.stdout.on("data", (value: Buffer) => { stdout += value.toString(); });
        proc.stderr.on("data", (value: Buffer) => { stderr += value.toString(); });
        proc.stdin.end(stdin);
        proc.once("error", (error) => {
            clearTimeout(timer);
            resolveResult({ stdout: "", stderr: error.message, exitCode: 127, executionTime: Date.now() - startedAt });
        });
        proc.once("close", (code) => {
            clearTimeout(timer);
            resolveResult({ stdout: stdout.slice(0, 500000), stderr: `${stderr}${timedOut ? "\nCommand timed out." : ""}`.trim(), exitCode: code ?? 1, executionTime: Date.now() - startedAt });
        });
    });
}
function safeRelativePath(pathname: string) {
    const value = normalize(pathname.trim().replace(/^\/+/, "") || ".");
    if (value === ".." || value.startsWith("..\\") || value.startsWith("../"))
        throw new Error("Workspace path escapes the session root.");
    return value;
}
function workspacePathFor(id: string) {
    return resolve(WORKSPACE_ROOT, id);
}
function stageRootFor(sessionId: string, stageId: string) {
    return resolve(WORKSPACE_ROOT, ".staging", sessionId, stageId);
}
function containerNameFor(id: string) {
    return `skcoder-${id.replaceAll("-", "")}`;
}
async function checkSize(pathname: string, limit: number, message: string) {
    const result = await run("du", ["-sb", pathname], 5000);
    const bytes = Number(result.stdout.split(/\s+/)[0]);
    if (Number.isFinite(bytes) && bytes >= limit)
        throw new Error(message);
}
function stageRelativePath(pathname: string) {
    const requested = safeRelativePath(pathname);
    if (requested === ".")
        throw new Error("A staged file path is required.");
    return requested;
}
function missingOffsets(file: WorkspaceStageFile, completed: Set<number>) {
    const offsets: number[] = [];
    for (let offset = 0; offset < file.size; offset += STAGE_CHUNK_BYTES)
        if (!completed.has(offset))
            offsets.push(offset);
    return offsets;
}
async function hashFile(pathname: string) {
    const hash = createHash("sha256");
    await new Promise<void>((resolveResult, reject) => {
        const stream = createReadStream(pathname);
        stream.on("data", (chunk: string | Buffer) => hash.update(chunk));
        stream.once("error", reject);
        stream.once("end", resolveResult);
    });
    return hash.digest("hex");
}
async function ensureCapacity() {
    const [workspaceUsage, disk] = await Promise.all([
        run("du", ["-sb", WORKSPACE_ROOT], 5000),
        run("df", ["-B1", "--output=avail", WORKSPACE_ROOT], 5000),
    ]);
    const usedBytes = Number(workspaceUsage.stdout.split(/\s+/)[0]);
    const freeBytes = Number(disk.stdout.trim().split(/\s+/).at(-1));
    if (Number.isFinite(usedBytes) && usedBytes >= WORKSPACE_MAX_BYTES)
        throw new Error("Cloud workspace capacity is full. Source files remain available in browser storage.");
    if (Number.isFinite(freeBytes) && freeBytes < WORKSPACE_SAFETY_RESERVE_BYTES)
        throw new Error("Cloud runtime is preserving its safety reserve. Source files remain available in browser storage.");
}
async function activeRuntimeCount() {
    const result = await run("docker", ["ps", "--filter", "label=skcoder.workspace=true", "-q"], 5000);
    if (result.exitCode !== 0)
        return sessions.size;
    return result.stdout.split("\n").filter(Boolean).length;
}
export async function ensureDockerReady() {
    if (dockerReady !== null)
        return dockerReady;
    const result = await run("docker", ["version", "--format", "{{.Server.Version}}"], 5000);
    dockerReady = result.exitCode === 0 && Boolean(result.stdout.trim());
    return dockerReady;
}
export async function createWorkspaceSession(options?: {
    retentionMode?: RetentionMode;
}) {
    if (!(await ensureDockerReady()))
        throw new Error("The isolated runtime service is not available.");
    await removeExpiredWorkspaceSessions();
    await suspendScheduledWorkspaceRuntimes();
    if (await activeRuntimeCount() >= SESSION_MAX_COUNT)
        throw new Error("The server has reached its active workspace limit.");
    await mkdir(WORKSPACE_ROOT, { recursive: true, mode: 0o700 });
    await ensureCapacity();
    await checkSize(WORKSPACE_ROOT, WORKSPACE_MAX_BYTES, "Cloud workspace capacity is full. Source files remain available in browser storage.");
    const id = randomUUID();
    const workspacePath = workspacePathFor(id);
    const containerName = containerNameFor(id);
    const retentionMode = options?.retentionMode === "four-hours" ? "four-hours" : "three-days";
    await mkdir(workspacePath, { recursive: true, mode: 0o777 });
    await chmod(workspacePath, 0o777);
    const result = await run("docker", [
        "run", "-d", "--rm", "--name", containerName, "--label", "skcoder.workspace=true", "--label", `skcoder.workspace-id=${id}`, "--network", "none", "--memory", "1024m", "--memory-swap", "1024m", "--cpus", "1", "--pids-limit", "256",
        "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--user", "1000:1000", "-v", `${workspacePath}:/workspace:rw`, "-w", "/workspace", "--tmpfs", "/tmp:rw,size=256m,mode=1777",
        RUNTIME_IMAGE, "sleep", "infinity",
    ], 30000);
    if (result.exitCode !== 0) {
        await rm(workspacePath, { recursive: true, force: true });
        throw new Error(result.stderr || "The isolated runtime could not start.");
    }
    const session: WorkspaceSession = { id, containerName, workspacePath, createdAt: Date.now(), lastUsedAt: Date.now(), retentionMode };
    try {
        await createWorkspaceRecord(id, SESSION_MAX_BYTES, retentionMode);
    }
    catch (error) {
        await run("docker", ["rm", "-f", containerName], 10000);
        await rm(workspacePath, { recursive: true, force: true });
        throw error;
    }
    sessions.set(id, session);
    startCleanup();
    return session;
}
export async function getWorkspaceSession(id: string) {
    let session = sessions.get(id);
    if (!session) {
        const record = await getWorkspaceRecord(id);
        if (!record || record.state === "deleted")
            throw new Error("Workspace session not found or expired.");
        const containerName = containerNameFor(id);
        const probe = await run("docker", ["inspect", "-f", "{{.State.Running}}", containerName], 5000);
        if (probe.exitCode !== 0 || probe.stdout.trim() !== "true")
            throw new Error("Workspace runtime is not active. Reconnect to create a new runtime session.");
        session = { id, containerName, workspacePath: workspacePathFor(id), createdAt: record.createdAt, lastUsedAt: Date.now(), retentionMode: record.retentionMode };
        sessions.set(id, session);
    }
    session.lastUsedAt = Date.now();
    await touchWorkspaceRecord(id);
    return session;
}
export async function syncWorkspaceFiles(id: string, files: WorkspaceFile[]) {
    const session = await getWorkspaceSession(id);
    if (files.length > 5000)
        throw new Error("Workspace file limit reached.");
    for (const file of files) {
        if (typeof file.path !== "string" || typeof file.content !== "string")
            throw new Error("Invalid workspace file payload.");
        if (file.encoding && file.encoding !== "utf8" && file.encoding !== "base64")
            throw new Error("Unsupported workspace file encoding.");
        const requested = safeRelativePath(file.path);
        if (requested === ".")
            throw new Error("A workspace file path is required.");
        const target = resolve(session.workspacePath, requested);
        if (relative(session.workspacePath, target).startsWith(".."))
            throw new Error("Workspace path escapes the session root.");
        await mkdir(dirname(target), { recursive: true, mode: 0o777 });
        await writeFile(target, file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content, file.encoding === "base64" ? undefined : "utf8");
    }
    await ensureCapacity();
    await incrementWorkspaceRevision(id);
}
function describeWorkspaceStage(stage: WorkspaceStage) {
    return {
        stageId: stage.id,
        chunkBytes: STAGE_CHUNK_BYTES,
        files: [...stage.files.values()].map((file) => ({
            path: file.path,
            size: file.size,
            missingOffsets: missingOffsets(file, stage.completedOffsets.get(file.path) ?? new Set<number>()),
        })),
    };
}
async function requireWorkspaceStage(sessionId: string, stageId: string) {
    await getWorkspaceSession(sessionId);
    const stage = stages.get(stageId);
    if (!stage || stage.sessionId !== sessionId)
        throw new Error("Staging session not found or expired.");
    return stage;
}
export async function beginWorkspaceStage(sessionId: string, requestedFiles: WorkspaceStageFile[], existingStageId?: string) {
    await getWorkspaceSession(sessionId);
    if (existingStageId) {
        const existing = await requireWorkspaceStage(sessionId, existingStageId);
        return describeWorkspaceStage(existing);
    }
    if (!Array.isArray(requestedFiles) || requestedFiles.length === 0)
        throw new Error("A non-empty staging manifest is required.");
    const files = new Map<string, WorkspaceStageFile>();
    for (const item of requestedFiles) {
        const path = stageRelativePath(item.path);
        if (!Number.isSafeInteger(item.size) || item.size < 0 || (item.sha256 !== undefined && !/^[a-f0-9]{64}$/i.test(item.sha256)))
            throw new Error("A staged file requires a valid size and optional SHA-256 checksum.");
        if (files.has(path))
            throw new Error("The staging manifest contains duplicate file paths.");
        files.set(path, { path, size: item.size, sha256: item.sha256?.toLowerCase(), revision: item.revision });
    }
    const id = randomUUID();
    const stage: WorkspaceStage = {
        id,
        sessionId,
        rootPath: stageRootFor(sessionId, id),
        files,
        completedOffsets: new Map([...files.keys()].map((path) => [path, new Set<number>()])),
    };
    await mkdir(stage.rootPath, { recursive: true, mode: 0o700 });
    stages.set(id, stage);
    return describeWorkspaceStage(stage);
}
export async function getWorkspaceStageStatus(sessionId: string, stageId: string) {
    return describeWorkspaceStage(await requireWorkspaceStage(sessionId, stageId));
}
export async function writeWorkspaceStageChunk(sessionId: string, stageId: string, filePath: string, offset: number, data: Buffer, checksum?: string) {
    const stage = await requireWorkspaceStage(sessionId, stageId);
    const path = stageRelativePath(filePath);
    const file = stage.files.get(path);
    if (!file)
        throw new Error("Chunk path is not part of the staging manifest.");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset % STAGE_CHUNK_BYTES !== 0)
        throw new Error("Chunk offset is invalid.");
    const expectedLength = Math.min(STAGE_CHUNK_BYTES, file.size - offset);
    if (expectedLength < 0 || data.length !== expectedLength)
        throw new Error("Chunk length does not match the manifest.");
    const receivedHash = createHash("sha256").update(data).digest("hex");
    if (checksum && checksum.toLowerCase() !== receivedHash)
        throw new Error("Chunk checksum verification failed.");
    const target = resolve(stage.rootPath, path);
    if (relative(stage.rootPath, target).startsWith(".."))
        throw new Error("Staging path escapes the session root.");
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    let handle;
    try {
        handle = await open(target, "r+");
    }
    catch {
        handle = await open(target, "w+");
    }
    try {
        await handle.write(data, 0, data.length, offset);
    }
    finally {
        await handle.close();
    }
    stage.completedOffsets.get(path)?.add(offset);
    await ensureCapacity();
    return { path, offset, receivedBytes: data.length, checksum: receivedHash };
}
export async function commitWorkspaceStage(sessionId: string, stageId: string) {
    const session = await getWorkspaceSession(sessionId);
    const stage = await requireWorkspaceStage(sessionId, stageId);
    for (const file of stage.files.values()) {
        const completed = stage.completedOffsets.get(file.path) ?? new Set<number>();
        if (missingOffsets(file, completed).length > 0)
            throw new Error(`Staging file is incomplete: ${file.path}`);
        const staged = resolve(stage.rootPath, file.path);
        if (file.size === 0) {
            await mkdir(dirname(staged), { recursive: true, mode: 0o700 });
            await writeFile(staged, "");
        }
        if ((await stat(staged)).size !== file.size || (file.sha256 !== undefined && (await hashFile(staged)) !== file.sha256))
            throw new Error(`Staging verification failed: ${file.path}`);
    }
    for (const file of stage.files.values()) {
        const staged = resolve(stage.rootPath, file.path);
        const target = resolve(session.workspacePath, file.path);
        if (relative(session.workspacePath, target).startsWith(".."))
            throw new Error("Workspace path escapes the session root.");
        await mkdir(dirname(target), { recursive: true, mode: 0o777 });
        await rename(staged, target);
    }
    stages.delete(stage.id);
    await rm(stage.rootPath, { recursive: true, force: true });
    await ensureCapacity();
    await incrementWorkspaceRevision(sessionId);
    return { revision: (await getWorkspaceLifecycle(sessionId)).revision };
}
export async function removeWorkspaceStage(sessionId: string, stageId: string) {
    const stage = await requireWorkspaceStage(sessionId, stageId);
    stages.delete(stage.id);
    await rm(stage.rootPath, { recursive: true, force: true });
}
export async function runWorkspaceCommand(id: string, command: string, cwd = "/", stdin = "") {
    const session = await getWorkspaceSession(id);
    const requested = safeRelativePath(cwd);
    const workspaceCwd = requested === "." ? "/workspace" : `/workspace/${requested.replaceAll("\\", "/")}`;
    const result = await run("docker", ["exec", "-i", "--user", "0:0", "-e", "HOME=/workspace", "-w", workspaceCwd, session.containerName, "bash", "-lc", command], COMMAND_TIMEOUT_MS, stdin);
    await ensureCapacity();
    await incrementWorkspaceRevision(id);
    return result;
}
export async function runCodeInWorkspace(id: string, language: string, code: string, stdin = "") {
    const session = await getWorkspaceSession(id);
    const runPath = `.skcoder-runs/${randomUUID()}`;
    const hostRunPath = resolve(session.workspacePath, runPath);
    const config: Record<string, {
        filename: string;
        command: string;
    }> = {
        python: { filename: "main.py", command: "python3 main.py" }, py: { filename: "main.py", command: "python3 main.py" },
        node: { filename: "main.js", command: "node main.js" }, nodejs: { filename: "main.js", command: "node main.js" }, javascript: { filename: "main.js", command: "node main.js" }, js: { filename: "main.js", command: "node main.js" }, mjs: { filename: "main.mjs", command: "node main.mjs" }, cjs: { filename: "main.cjs", command: "node main.cjs" },
        typescript: { filename: "main.ts", command: "tsx main.ts" }, ts: { filename: "main.ts", command: "tsx main.ts" }, tsx: { filename: "main.tsx", command: "tsx main.tsx" },
        bash: { filename: "main.sh", command: "bash main.sh" }, shell: { filename: "main.sh", command: "bash main.sh" },
        java: { filename: "Main.java", command: "javac Main.java && java Main" }, c: { filename: "main.c", command: "gcc main.c -O2 -o main && ./main" }, cpp: { filename: "main.cpp", command: "g++ main.cpp -O2 -o main && ./main" },
        cc: { filename: "main.cpp", command: "g++ main.cpp -O2 -o main && ./main" }, kotlin: { filename: "Main.kt", command: "kotlinc Main.kt -include-runtime -d main.jar && java -jar main.jar" }, kt: { filename: "Main.kt", command: "kotlinc Main.kt -include-runtime -d main.jar && java -jar main.jar" },
        rust: { filename: "main.rs", command: "rustc main.rs -O -o main && ./main" }, rs: { filename: "main.rs", command: "rustc main.rs -O -o main && ./main" }, go: { filename: "main.go", command: "mkdir -p .go-tmp && TMPDIR=$PWD/.go-tmp go run main.go" }, php: { filename: "main.php", command: "php main.php" }, ruby: { filename: "main.rb", command: "ruby main.rb" }, rb: { filename: "main.rb", command: "ruby main.rb" },
    };
    const selected = config[language.toLowerCase()];
    if (!selected)
        throw new Error(`Unsupported runtime: ${language}`);
    if (stdin.length > 65536)
        throw new Error("Program input exceeds the 64 KB source-run limit.");
    await mkdir(hostRunPath, { recursive: true, mode: 0o777 });
    await writeFile(join(hostRunPath, selected.filename), code, "utf8");
    try {
        return await runWorkspaceCommand(id, selected.command, runPath, stdin);
    }
    finally {
        await rm(hostRunPath, { recursive: true, force: true });
    }
}
export async function runEphemeralCode(language: string, code: string, stdin = "") {
    const session = await createWorkspaceSession();
    try {
        return await runCodeInWorkspace(session.id, language, code, stdin);
    }
    finally {
        await closeWorkspaceSession(session.id);
    }
}
export async function openInteractiveTerminal(id: string, onStdout: (value: string) => void, onStderr: (value: string) => void, onClose: (code: number) => void) {
    const session = await getWorkspaceSession(id);
    const proc = spawn("docker", ["exec", "-i", "--user", "0:0", "-e", "HOME=/workspace", "-w", "/workspace", session.containerName, "bash", "--noprofile", "--norc"], { env: { ...process.env, TERM: "xterm-256color", HOME: "/workspace" } });
    proc.stdout.on("data", (value: Buffer) => onStdout(value.toString()));
    proc.stderr.on("data", (value: Buffer) => onStderr(value.toString()));
    proc.once("close", (code) => onClose(code ?? 1));
    return proc;
}
export function terminateInteractiveTerminal(proc: ChildProcess) {
    proc.kill("SIGTERM");
    setTimeout(() => proc.kill("SIGKILL"), 1000).unref();
}
export async function workspaceStatus() {
    startCleanup();
    await removeExpiredWorkspaceSessions();
    await suspendScheduledWorkspaceRuntimes();
    const [disk, activeSessions] = await Promise.all([
        run("df", ["-B1", "--output=size,used,avail", WORKSPACE_ROOT], 5000),
        activeRuntimeCount(),
    ]);
    return {
        ready: await ensureDockerReady(),
        activeSessions,
        image: RUNTIME_IMAGE,
        capacity: {
            workspaceMaxBytes: WORKSPACE_MAX_BYTES,
            sessionMaxBytes: SESSION_MAX_BYTES,
            safetyReserveBytes: WORKSPACE_SAFETY_RESERVE_BYTES,
            disk: disk.exitCode === 0 ? disk.stdout.trim().split("\n").at(-1) : null,
        },
    };
}
export async function getWorkspaceLifecycle(id: string) {
    const record = await getWorkspaceRecord(id);
    if (!record)
        throw new Error("Workspace session not found or expired.");
    return record;
}
export async function updateWorkspaceRetention(id: string, retentionMode: RetentionMode) {
    const record = await setWorkspaceRetention(id, retentionMode);
    if (!record)
        throw new Error("Workspace session not found or expired.");
    const session = sessions.get(id);
    if (session)
        session.retentionMode = retentionMode;
    return record;
}
export async function scheduleWorkspaceDeletion(id: string) {
    const record = await scheduleWorkspaceDelete(id);
    if (!record)
        throw new Error("Workspace session not found or expired.");
    const session = sessions.get(id);
    if (session) {
        sessions.delete(id);
        await run("docker", ["stop", session.containerName], 10000);
    }
    return record;
}
export async function cancelWorkspaceDeletion(id: string) {
    const record = await cancelWorkspaceDelete(id);
    if (!record)
        throw new Error("Workspace session not found or expired.");
    const containerName = containerNameFor(id);
    const start = await run("docker", ["start", containerName], 10000);
    if (start.exitCode !== 0)
        throw new Error(start.stderr || "Workspace runtime could not restart.");
    return record;
}
async function closeWorkspaceSession(id: string) {
    const session = sessions.get(id);
    const containerName = session?.containerName ?? containerNameFor(id);
    const workspacePath = session?.workspacePath ?? workspacePathFor(id);
    sessions.delete(id);
    for (const stage of stages.values())
        if (stage.sessionId === id)
            stages.delete(stage.id);
    await run("docker", ["rm", "-f", containerName], 10000);
    await Promise.all([
        rm(workspacePath, { recursive: true, force: true }),
        rm(resolve(WORKSPACE_ROOT, ".staging", id), { recursive: true, force: true }),
    ]);
    await markWorkspaceDeleted(id);
}
async function removeExpiredWorkspaceSessions() {
    for (const record of await listExpiredWorkspaceRecords())
        await closeWorkspaceSession(record.id);
}
async function suspendScheduledWorkspaceRuntimes() {
    for (const record of await listScheduledWorkspaceRecords()) {
        sessions.delete(record.id);
        await run("docker", ["stop", containerNameFor(record.id)], 10000);
    }
}
function startCleanup() {
    if (cleanupStarted)
        return;
    cleanupStarted = true;
    void removeExpiredWorkspaceSessions();
    void suspendScheduledWorkspaceRuntimes();
    const timer = setInterval(async () => {
        const cutoff = Date.now() - SESSION_TTL_HOURS * 60 * 60 * 1000;
        for (const session of sessions.values())
            if (session.lastUsedAt < cutoff)
                await closeWorkspaceSession(session.id);
        await removeExpiredWorkspaceSessions();
        await suspendScheduledWorkspaceRuntimes();
    }, 5 * 60 * 1000);
    timer.unref();
}
