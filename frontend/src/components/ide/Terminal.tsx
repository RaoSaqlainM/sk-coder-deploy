import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { useIDEStore } from "@/store/ideStore";
import { execute, type ExecResponse } from "@/lib/executorChain";
import { createTerminalWebSocket, getWorkspaceLifecycle, getWorkspaceRuntimeStatus, isBackendAvailable, scheduleWorkspaceDelete, setWorkspaceRetention, syncWorkspaceFiles, type WorkspaceFilePayload, type WorkspaceLifecycle } from "@/lib/backendRunner";
import { sendAIMessage, buildSystemPrompt } from "@/lib/aiClient";
import { parseErrors } from "@/components/ide/ErrorPanel";
import { classifyPermissionRequest, formatPermissionLabel, savePermissionGrant, shouldPromptForPermission } from "@/lib/permissionPolicy";
import type { FileNode, AIChatMessage } from "@/types/ide";
import { buildPreview } from "@/lib/previewBuilder";
declare global {
    interface Window {
        puter?: {
            auth: {
                signIn: () => Promise<void>;
                isSignedIn: () => boolean;
            };
            ai: {
                chat: (msgs: {
                    role: string;
                    content: string;
                }[] | string, opts?: {
                    model?: string;
                }) => Promise<{
                    message: {
                        content: Array<{
                            text: string;
                        }>;
                    };
                }>;
            };
        };
    }
}
type TermType = "shell" | "python" | "nodejs" | "java" | "ai";
type TermLine = {
    id: string;
    type: "input" | "output" | "error" | "info" | "success" | "ai-response" | "ai-thinking";
    content: string;
};
type TabDef = {
    id: string;
    type: TermType;
    label: string;
};
type TabState = {
    lines: TermLine[];
    input: string;
    history: string[];
    histIdx: number;
    historyDraft: string;
    cwd: string;
    running: boolean;
};
type WorkspaceConnectionState = "checking" | "connected" | "waiting" | "offline";
function mkLine(type: TermLine["type"], content: string): TermLine {
    return { id: Math.random().toString(36).slice(2), type, content };
}
function initState(type: TermType): TabState {
    const welcomes: Record<TermType, string> = {
        shell: "SK Shell — Live workspace commands when available · local file utilities when offline",
        python: "Python Run — source execution; project commands use SK Shell",
        nodejs: "Node.js Run — source execution; project commands use SK Shell",
        java: "Java Run — source execution; project commands use SK Shell",
        ai: "AI Terminal — Ask about the current workspace or propose an approved action",
    };
    return {
        lines: [mkLine("info", welcomes[type])],
        input: "",
        history: [],
        histIdx: -1,
        historyDraft: "",
        cwd: "/",
        running: false,
    };
}
let _tabCounter = 10;
function nextTabId(type: TermType) {
    return `${type}-${++_tabCounter}`;
}
function findNodeAtPath(tree: FileNode[], path: string): FileNode | null {
    for (const n of tree) {
        if (n.path === path)
            return n;
        if (n.children) {
            const found = findNodeAtPath(n.children, path);
            if (found)
                return found;
        }
    }
    return null;
}
function getChildrenAt(tree: FileNode[], path: string): FileNode[] {
    if (path === "/" || path === "")
        return tree;
    const node = findNodeAtPath(tree, path);
    return node?.children || [];
}
function collectWorkspaceFiles(nodes: FileNode[]): WorkspaceFilePayload[] {
    const files: WorkspaceFilePayload[] = [];
    for (const node of nodes) {
        if (node.type === "file")
            files.push({ path: node.path, content: node.content ?? "" });
        if (node.children)
            files.push(...collectWorkspaceFiles(node.children));
    }
    return files;
}
function resolvePath(cwd: string, input: string): string {
    if (!input || input === "~")
        return "/";
    if (input.startsWith("/"))
        return input.replace(/\/$/, "") || "/";
    const parts = cwd === "/" ? [] : cwd.split("/").filter(Boolean);
    for (const seg of input.split("/")) {
        if (seg === "..")
            parts.pop();
        else if (seg !== ".")
            parts.push(seg);
    }
    return parts.length ? "/" + parts.join("/") : "/";
}
const TERM_COLORS: Record<TermType, string> = {
    shell: "#4eaa25",
    python: "#3572a5",
    nodejs: "#68a063",
    java: "#f89820",
    ai: "#a78bfa",
};
const TERM_LABELS: Record<TermType, string> = {
    shell: "SK Shell",
    python: "Python Run",
    nodejs: "Node Run",
    java: "Java Run",
    ai: "AI Terminal",
};
const WORKSPACE_COMMANDS = new Set([
    "npm", "npx", "pnpm", "yarn", "pip", "pip3", "git", "curl", "wget", "bash", "sh", "chmod", "rm", "cp", "mv", "find", "grep", "sed", "apt", "apk", "go", "cargo", "rustc", "javac",
]);
function isWorkspaceCommand(input: string) {
    const command = input.trim().split(/\s+/, 1)[0]?.toLowerCase();
    return Boolean(command && WORKSPACE_COMMANDS.has(command));
}
const ADD_OPTIONS: {
    type: TermType;
    label: string;
    desc: string;
}[] = [
    { type: "shell", label: "SK Shell", desc: "Live workspace terminal for Node.js, packages, builds, and commands" },
    { type: "ai", label: "AI Terminal", desc: "Workspace-aware help with explicit approvals" },
];
function TermIcon({ type }: {
    type: TermType;
}) {
    if (type === "shell")
        return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>);
    if (type === "python")
        return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C8 2 6 4 6 7v2h6v1H5C3 10 2 11 2 13s1 3 3 4h2v2c0 2 2 3 5 3s5-1 5-3v-2h6c2 0 3-1 3-3s-1-3-3-4h-1V7C22 4 20 2 16 2h-4z"/>
    </svg>);
    if (type === "nodejs")
        return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>);
    if (type === "java")
        return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3c0 2 3 2 3 4s-3 2-3 4 3 2 3 4-3 2-3 4"/><path d="M14 6c2 1 3 2 3 4s-1 3-3 4"/>
    </svg>);
    if (type === "ai")
        return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h2a7 7 0 0 1 7 7H2a7 7 0 0 1 7-7h2V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/>
      <rect x="2" y="14" width="20" height="8" rx="2"/>
      <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>);
    return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>);
}
async function ensurePuterForTerm(): Promise<boolean> {
    if (window.puter)
        return true;
    return new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = "https://js.puter.com/v2/";
        s.onload = () => setTimeout(() => resolve(!!window.puter), 400);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}
const DEFAULT_TABS: TabDef[] = [
    { id: "shell-1", type: "shell", label: "SK Shell" },
    { id: "ai-1", type: "ai", label: "AI Terminal" },
];
const DEFAULT_STATES: Record<string, TabState> = {
    "shell-1": initState("shell"),
    "ai-1": initState("ai"),
};
function loadPersistedTerminalState() {
    try {
        const raw = localStorage.getItem("sk-coder-terminal-state-v1");
        if (!raw)
            return null;
        const parsed = JSON.parse(raw) as {
            tabs?: TabDef[];
            activeTab?: string;
            tabStates?: Record<string, TabState>;
        };
        if (!parsed.tabs || !parsed.tabStates)
            return null;
        const allowedTypes = new Set<TermType>(["shell", "ai"]);
        const tabs = parsed.tabs
            .filter((tab) => allowedTypes.has(tab.type))
            .map((tab) => ({
            ...tab,
            label: tab.type === "ai" ? "AI Terminal" : "SK Shell",
        }));
        if (!tabs.some((tab) => tab.type === "shell"))
            tabs.unshift({ id: "shell-1", type: "shell", label: "SK Shell" });
        if (!tabs.some((tab) => tab.type === "ai"))
            tabs.push({ id: "ai-1", type: "ai", label: "AI Terminal" });
        const tabStates: Record<string, TabState> = {};
        for (const tab of tabs) {
            const state = { ...(parsed.tabStates[tab.id] ?? initState(tab.type)), running: false };
            if (tab.type === "shell") {
                state.lines = state.lines.map((line) => line.content === "SK Shell — Oracle workspace commands when connected · local file utilities when offline"
                    ? { ...line, content: "SK Shell — Live workspace commands when available · local file utilities when offline" }
                    : line);
                let unavailableSeen = false;
                state.lines = state.lines.filter((line) => {
                    if (!/isolated runtime service is not available|Oracle Docker workspace is unavailable/i.test(line.content))
                        return true;
                    if (unavailableSeen)
                        return false;
                    unavailableSeen = true;
                    return true;
                });
            }
            tabStates[tab.id] = state;
        }
        const activeTab = tabs.some((tab) => tab.id === parsed.activeTab) ? parsed.activeTab : tabs[0].id;
        return { tabs, activeTab, tabStates };
    }
    catch {
        return null;
    }
}
export default function MultiTerminal() {
    const { fileTree, addFile, settings, getActiveFile, setShowSettings, setSettingsTab, terminalBridgeCmd, setTerminalBridgeCmd, setErrors, setActivePanel, setPreviewContent, setPreviewResult } = useIDEStore();
    const [tabs, setTabs] = useState<TabDef[]>(() => loadPersistedTerminalState()?.tabs ?? DEFAULT_TABS);
    const [activeTab, setActiveTab] = useState(() => loadPersistedTerminalState()?.activeTab ?? "shell-1");
    const [tabStates, setTabStates] = useState<Record<string, TabState>>(() => loadPersistedTerminalState()?.tabStates ?? DEFAULT_STATES);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [addMenuPos, setAddMenuPos] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [aiReady, setAiReady] = useState(false);
    const [workspaceLifecycle, setWorkspaceLifecycle] = useState<WorkspaceLifecycle | null>(null);
    const [workspaceConnection, setWorkspaceConnection] = useState<WorkspaceConnectionState>("checking");
    const addMenuRef = useRef<HTMLDivElement>(null);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const terminalSocketsRef = useRef(new Map<string, ReturnType<typeof createTerminalWebSocket>>());
    const workspaceSessionIdRef = useRef<string | null>(null);
    const terminalErrorMessagesRef = useRef(new Set<string>());
    const stickToOutputEndRef = useRef(true);
    const activeState = tabStates[activeTab] ?? initState("shell");
    const activeType = tabs.find((t) => t.id === activeTab)?.type ?? "shell";
    useEffect(() => {
        if (outputRef.current && stickToOutputEndRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [tabStates, activeTab]);
    useEffect(() => {
        try {
            localStorage.setItem("sk-coder-terminal-state-v1", JSON.stringify({ tabs, activeTab, tabStates }));
        }
        catch {
        }
    }, [tabs, activeTab, tabStates]);
    useEffect(() => {
        inputRef.current?.focus();
    }, [activeTab]);
    function connectShell(tabId: string, requestedSessionId?: string | null) {
        if (!settings.backend.enabled || terminalSocketsRef.current.has(tabId))
            return;
        const savedSessionId = requestedSessionId ?? workspaceSessionIdRef.current ?? localStorage.getItem("sk-coder-workspace-session-id");
        let socket: ReturnType<typeof createTerminalWebSocket> | null = null;
        const isCurrentSocket = () => socket !== null && terminalSocketsRef.current.get(tabId) === socket;
        socket = createTerminalWebSocket({
            onReady: (sessionId) => {
                if (!isCurrentSocket())
                    return;
                terminalErrorMessagesRef.current.delete(tabId);
                setWorkspaceConnection("connected");
                workspaceSessionIdRef.current = sessionId;
                localStorage.setItem("sk-coder-workspace-session-id", sessionId);
                addLine(tabId, "success", savedSessionId ? "Connected to shared isolated workspace session." : "Connected to isolated workspace session.");
                void getWorkspaceLifecycle(sessionId).then(setWorkspaceLifecycle).catch(() => setWorkspaceLifecycle(null));
            },
            onStdout: (data) => {
                if (isCurrentSocket())
                    addLines(tabId, "output", data);
            },
            onStderr: (data) => {
                if (isCurrentSocket())
                    addLines(tabId, "error", data);
            },
            onExit: (code) => {
                if (isCurrentSocket())
                    addLine(tabId, "info", `Process exited with code ${code}`);
            },
            onError: (message) => {
                if (!isCurrentSocket())
                    return;
                terminalSocketsRef.current.delete(tabId);
                if (savedSessionId) {
                    localStorage.removeItem("sk-coder-workspace-session-id");
                    workspaceSessionIdRef.current = null;
                    connectShell(tabId, null);
                    return;
                }
                const readableMessage = /isolated runtime service is not available/i.test(message)
                    ? "Workspace session could not start."
                    : message;
                setWorkspaceConnection(/isolated runtime service is not available|WebSocket connection failed/i.test(message) ? "waiting" : "offline");
                if (terminalErrorMessagesRef.current.has(`${tabId}:${readableMessage}`))
                    return;
                terminalErrorMessagesRef.current.add(`${tabId}:${readableMessage}`);
                setTabStates((previous) => {
                    const state = previous[tabId] ?? initState("shell");
                    if (state.lines.some((line) => line.type === "error" && line.content === readableMessage))
                        return previous;
                    return { ...previous, [tabId]: { ...state, lines: [...state.lines, mkLine("error", readableMessage)] } };
                });
            },
        }, savedSessionId || undefined);
        terminalSocketsRef.current.set(tabId, socket);
    }
    useEffect(() => {
        if (!settings.backend.enabled)
            return;
        let disposed = false;
        void isBackendAvailable().then((available) => {
            if (disposed || !available) {
                if (!disposed)
                    setWorkspaceConnection("offline");
                return;
            }
            void getWorkspaceRuntimeStatus().then((status) => {
                if (disposed)
                    return;
                if (!status.ready) {
                    setWorkspaceConnection("waiting");
                    return;
                }
                connectShell("shell-1");
            });
        });
        return () => {
            disposed = true;
            workspaceSessionIdRef.current = null;
            setWorkspaceLifecycle(null);
            for (const socket of terminalSocketsRef.current.values())
                socket.close();
            terminalSocketsRef.current.clear();
        };
    }, [settings.backend.enabled]);
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
                setShowAddMenu(false);
            }
        }
        if (showAddMenu) {
            document.addEventListener("mousedown", handleClick);
            return () => document.removeEventListener("mousedown", handleClick);
        }
        return undefined;
    }, [showAddMenu]);
    function openAddMenu(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (showAddMenu) {
            setShowAddMenu(false);
            setAddMenuPos(null);
        }
        else {
            const rect = addBtnRef.current?.getBoundingClientRect();
            if (rect)
                setAddMenuPos({ x: rect.left, y: rect.bottom + 6 });
            setShowAddMenu(true);
        }
    }
    useEffect(() => {
        if (!terminalBridgeCmd)
            return;
        const targetType = (terminalBridgeCmd.targetType as TermType | undefined) ?? "shell";
        let tab = tabs.find((t) => t.type === targetType);
        let currentTabs = tabs;
        let currentStates = tabStates;
        if (!tab) {
            const id = nextTabId(targetType);
            const label = TERM_LABELS[targetType] ?? targetType;
            const newTab: TabDef = { id, type: targetType, label };
            currentTabs = [...tabs, newTab];
            currentStates = { ...tabStates, [id]: initState(targetType) };
            setTabs(currentTabs);
            setTabStates(currentStates);
            tab = newTab;
        }
        const tabId = tab.id;
        setActiveTab(tabId);
        const cmds = terminalBridgeCmd.cmds ?? [terminalBridgeCmd.cmd];
        setTerminalBridgeCmd(null);
        let delay = 50;
        for (const cmd of cmds) {
            const c = cmd;
            const d = delay;
            setTimeout(() => {
                addLine(tabId, "input", `$ ${c}`);
                handleShell(tabId, c).catch(() => { });
            }, d);
            delay += 120;
        }
    }, [terminalBridgeCmd]);
    function updateState(tabId: string, patch: Partial<TabState>) {
        setTabStates((prev) => ({ ...prev, [tabId]: { ...(prev[tabId] ?? initState("shell")), ...patch } }));
    }
    function addLine(tabId: string, type: TermLine["type"], content: string) {
        setTabStates((prev) => {
            const cur = prev[tabId] ?? initState("shell");
            return { ...prev, [tabId]: { ...cur, lines: [...cur.lines.slice(-600), mkLine(type, content)] } };
        });
    }
    function addLines(tabId: string, type: TermLine["type"], text: string) {
        const parts = text.split("\n").filter((l) => l !== "");
        for (const p of parts)
            addLine(tabId, type, p);
    }
    function publishExecutionResult(result: ExecResponse) {
        setPreviewResult({
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            tier: result.tier,
            capability: result.capability,
            executionTime: result.executionTime,
        });
        setActivePanel("preview");
    }
    const DEFAULT_TAB_IDS = ["shell-1", "ai-1"];
    function clearTerminalHistory(tabId: string) {
        if (DEFAULT_TAB_IDS.includes(tabId)) {
            updateState(tabId, { lines: [], cwd: "/", history: [], input: "", histIdx: -1, historyDraft: "" });
        }
        else {
            updateState(tabId, { lines: [], input: "", histIdx: -1, historyDraft: "" });
        }
    }
    function addNewTab(type: TermType) {
        const id = nextTabId(type);
        const label = TERM_LABELS[type];
        setTabs((prev) => [...prev, { id, type, label }]);
        setTabStates((prev) => ({ ...prev, [id]: initState(type) }));
        setActiveTab(id);
        setShowAddMenu(false);
        if (type === "shell")
            connectShell(id);
        setTimeout(() => inputRef.current?.focus(), 50);
    }
    function closeTab(tabId: string) {
        if (tabs.length === 1)
            return;
        const idx = tabs.findIndex((t) => t.id === tabId);
        terminalSocketsRef.current.get(tabId)?.close();
        terminalSocketsRef.current.delete(tabId);
        const newTabs = tabs.filter((t) => t.id !== tabId);
        setTabs(newTabs);
        if (activeTab === tabId) {
            setActiveTab(newTabs[Math.max(0, idx - 1)].id);
        }
        setTabStates((prev) => {
            const next = { ...prev };
            delete next[tabId];
            return next;
        });
    }
    async function handleShell(tabId: string, input: string) {
        const state = tabStates[tabId];
        const cwd = state?.cwd || "/";
        const terminalSocket = terminalSocketsRef.current.get(tabId);
        const parts = input.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        if (workspaceSessionIdRef.current && terminalSocket) {
            try {
                if (cmd === "cd") {
                    const target = resolvePath(cwd, args[0] || "/");
                    const node = target === "/" ? null : findNodeAtPath(fileTree, target);
                    if (target === "/" || node?.type === "folder")
                        updateState(tabId, { cwd: target });
                }
                await syncWorkspaceFiles(workspaceSessionIdRef.current, collectWorkspaceFiles(fileTree));
                terminalSocket.sendCommand(input);
                return;
            }
            catch (error) {
                workspaceSessionIdRef.current = null;
                addLine(tabId, "error", error instanceof Error ? error.message : "Workspace synchronization failed.");
            }
        }
        if (cmd === "help") {
            const help = [
                "SK Shell commands:",
                "  ls [path]        — list files and directories",
                "  cd <path>        — change directory (cd .. to go up)",
                "  pwd              — print working directory",
                "  cat <file>       — show file content",
                "  echo <text>      — print text",
                "  run <file>       — execute file (auto-detects language)",
                "  python <file>    — run with Python 3",
                "  node <file>      — run with Node.js",
                "  java <file>      — run with Java",
                "  mkdir <name>     — create folder",
                "  touch <name>     — create empty file",
                "  clear / cls      — clear terminal",
                "  help             — show this help",
                "",
                "Tips:",
                "  • Tab key        — autocomplete file/folder names",
                "  • ↑↓ keys        — navigate command history",
                "  • Ctrl+C         — cancel current operation",
                "  • Ctrl+L         — clear screen",
                "  • Right-click any file → Open in Terminal",
            ];
            for (const l of help)
                addLine(tabId, "info", l);
            return;
        }
        if (cmd === "pwd") {
            addLine(tabId, "output", cwd);
            return;
        }
        if (cmd === "ls") {
            const path = args[0] ? resolvePath(cwd, args[0]) : cwd;
            const children = getChildrenAt(fileTree, path);
            if (children.length === 0) {
                addLine(tabId, "info", "(empty directory)");
            }
            else {
                const dirs = children.filter((c) => c.type === "folder").map((c) => c.name + "/");
                const fils = children.filter((c) => c.type === "file").map((c) => c.name);
                if (dirs.length)
                    addLine(tabId, "output", dirs.join("  "));
                if (fils.length)
                    addLine(tabId, "output", fils.join("  "));
            }
            return;
        }
        if (cmd === "cd") {
            const target = resolvePath(cwd, args[0] || "/");
            if (target === "/") {
                updateState(tabId, { cwd: "/" });
                return;
            }
            const node = findNodeAtPath(fileTree, target);
            if (!node || node.type !== "folder") {
                addLine(tabId, "error", `cd: ${args[0]}: No such directory`);
                return;
            }
            updateState(tabId, { cwd: target });
            return;
        }
        if (cmd === "cat") {
            if (!args[0]) {
                addLine(tabId, "error", "cat: missing file operand");
                return;
            }
            const path = resolvePath(cwd, args[0]);
            const node = findNodeAtPath(fileTree, path);
            if (!node || node.type === "folder") {
                addLine(tabId, "error", `cat: ${args[0]}: No such file`);
                return;
            }
            addLines(tabId, "output", node.content || "(empty file)");
            return;
        }
        if (cmd === "echo") {
            addLine(tabId, "output", args.join(" "));
            return;
        }
        if (cmd === "mkdir") {
            if (!args[0]) {
                addLine(tabId, "error", "mkdir: missing operand");
                return;
            }
            addFile(cwd, args[0].replace(/[/\\]/g, ""), "folder");
            addLine(tabId, "success", `Created folder: ${args[0]}`);
            return;
        }
        if (cmd === "touch") {
            if (!args[0]) {
                addLine(tabId, "error", "touch: missing operand");
                return;
            }
            addFile(cwd, args[0], "file", "");
            addLine(tabId, "success", `Created file: ${args[0]}`);
            return;
        }
        if (cmd === "run" || cmd === "python" || cmd === "node" || cmd === "java") {
            const filename = args[0];
            if (!filename) {
                addLine(tabId, "error", `${cmd}: specify a filename`);
                return;
            }
            const path = resolvePath(cwd, filename);
            const node = findNodeAtPath(fileTree, path);
            if (!node || node.type === "folder") {
                addLine(tabId, "error", `${cmd}: ${filename}: No such file`);
                return;
            }
            const code = node.content || "";
            const ext = filename.split(".").pop()?.toLowerCase() || "";
            updateState(tabId, { running: true });
            setPreviewResult(null);
            addLine(tabId, "info", `Running ${filename}...`);
            if (cmd === "run" && ["html", "htm"].includes(ext)) {
                setPreviewResult(null);
                setPreviewContent(buildPreview(fileTree, path));
                setActivePanel("preview");
                updateState(tabId, { running: false });
                return;
            }
            if (cmd === "python" || (cmd === "run" && ext === "py")) {
                await handlePython(tabId, code);
            }
            else if (cmd === "node" || (cmd === "run" && ["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext))) {
                await handleNodeJs(tabId, code);
            }
            else if (cmd === "java" || (cmd === "run" && ext === "java")) {
                await handleJava(tabId, code);
            }
            else if (cmd === "run") {
                const res = await execute(ext, code);
                if (res.stdout)
                    addLines(tabId, "output", res.stdout.trimEnd());
                if (res.stderr)
                    addLines(tabId, "error", res.stderr.trimEnd());
                if (!res.stdout && !res.stderr)
                    addLine(tabId, "info", "(no output)");
                publishExecutionResult(res);
            }
            else {
                addLine(tabId, "error", `Cannot run .${ext} files`);
            }
            updateState(tabId, { running: false });
            return;
        }
        if (isWorkspaceCommand(input)) {
            addLine(tabId, "error", `${cmd} requires an active live workspace. Connect a workspace, then run this command in SK Shell.`);
            return;
        }
        addLine(tabId, "error", `${cmd}: command not found. Type 'help' for available commands.`);
    }
    async function handlePython(tabId: string, code: string) {
        const res = await execute("python", code);
        addLine(tabId, "info", `Runtime: ${res.tier} — ${res.capability}`);
        if (res.stdout)
            addLines(tabId, "output", res.stdout.trimEnd());
        if (res.stderr) {
            addLines(tabId, "error", res.stderr.trimEnd());
            const errs = parseErrors(res.stderr);
            if (errs.length)
                setErrors(errs);
        }
        if (!res.stdout && !res.stderr)
            addLine(tabId, "info", "(no output)");
        if (res.executionTime > 0)
            addLine(tabId, "info", `⏱ ${res.executionTime}ms | exit ${res.exitCode}`);
        publishExecutionResult(res);
    }
    async function handleNodeJs(tabId: string, code: string) {
        const state = tabStates[tabId];
        const cwd = state?.cwd || "/";
        const trimmed = code.trim();
        const runMatch = trimmed.match(/^(?:run|node)\s+(\S+)/);
        let execCode = trimmed;
        if (runMatch) {
            const filename = runMatch[1];
            const path = resolvePath(cwd, filename);
            const node = findNodeAtPath(fileTree, path);
            if (!node || node.type === "folder") {
                addLine(tabId, "error", `run: ${filename}: No such file`);
                return;
            }
            addLine(tabId, "info", `Running ${filename}...`);
            execCode = node.content || "";
        }
        const res = await execute("node", execCode);
        addLine(tabId, "info", `Runtime: ${res.tier} — ${res.capability}`);
        if (res.stdout)
            addLines(tabId, "output", res.stdout.trimEnd());
        if (res.stderr)
            addLines(tabId, "error", res.stderr.trimEnd());
        if (!res.stdout && !res.stderr)
            addLine(tabId, "info", "(no output)");
        if (res.executionTime > 0)
            addLine(tabId, "info", `⏱ ${res.executionTime}ms | exit ${res.exitCode}`);
        publishExecutionResult(res);
    }
    async function handleJava(tabId: string, code: string) {
        const res = await execute("java", code);
        addLine(tabId, "info", `Runtime: ${res.tier} — ${res.capability}`);
        if (res.stdout)
            addLines(tabId, "output", res.stdout.trimEnd());
        if (res.stderr)
            addLines(tabId, "error", res.stderr.trimEnd());
        if (!res.stdout && !res.stderr)
            addLine(tabId, "info", "(no output)");
        if (res.executionTime > 0)
            addLine(tabId, "info", `⏱ ${res.executionTime}ms | exit ${res.exitCode}`);
        publishExecutionResult(res);
    }
    async function handleAI(tabId: string, question: string) {
        const { apiKey, usePuter, keyStatus, autoContext } = settings.ai;
        const action = classifyPermissionRequest(question);
        const scope = getActiveFile()?.path || "the current workspace";
        if (action && shouldPromptForPermission(action, scope, true)) {
            addLine(tabId, "info", `Permission requested for ${formatPermissionLabel(action)} on ${scope}`);
            addLine(tabId, "info", "Tip: allow once for this request or continue with read-only questions.");
            savePermissionGrant(action, scope);
        }
        const hasKey = usePuter || (apiKey && keyStatus === "valid");
        if (!hasKey) {
            addLine(tabId, "error", "No AI configured — go to Settings → AI to add a key or enable Free Puter AI");
            setSettingsTab("ai");
            setShowSettings(true);
            return;
        }
        const thinkingId = Math.random().toString(36).slice(2);
        setTabStates((prev) => {
            const cur = prev[tabId] ?? initState("ai");
            return { ...prev, [tabId]: { ...cur, lines: [...cur.lines, { id: thinkingId, type: "ai-thinking" as const, content: "Thinking..." }] } };
        });
        const activeFile = getActiveFile();
        const workspaceFiles = collectWorkspaceFiles(fileTree).slice(0, 8);
        const systemPrompt = buildSystemPrompt({
            activeFilePath: activeFile?.path,
            activeFileContent: autoContext ? activeFile?.content : undefined,
            fileTree: workspaceFiles.map((file) => file.path),
            workspaceFiles,
        });
        try {
            let reply = "";
            if (usePuter) {
                const ok = await ensurePuterForTerm();
                if (!ok) {
                    reply = "Puter.js failed to load. Check your internet.";
                }
                else {
                    if (!window.puter!.auth.isSignedIn())
                        await window.puter!.auth.signIn();
                    const resp = await window.puter!.ai.chat(`${systemPrompt}\n\nUser: ${question}`) as unknown;
                    const raw = resp as {
                        message?: {
                            content?: unknown;
                        };
                    };
                    const c = raw?.message?.content;
                    reply = typeof c === "string" ? c : Array.isArray(c) ? ((c[0] as {
                        text?: string;
                    })?.text ?? String(c[0] ?? "")) : typeof resp === "string" ? (resp as string) : String(c ?? "");
                    if (!reply.trim())
                        reply = "SK-AI returned an empty response. Try rephrasing.";
                    setAiReady(true);
                }
            }
            else {
                const messages: AIChatMessage[] = [{ id: "q", role: "user", content: question, timestamp: Date.now() }];
                const res = await sendAIMessage({ key: apiKey, customEndpoint: settings.ai.apiEndpoint, customModel: settings.ai.model, messages, systemPrompt });
                if (res.error)
                    reply = `Error: ${res.error}`;
                else
                    reply = res.content || "(no response)";
            }
            setTabStates((prev) => {
                const cur = prev[tabId] ?? initState("ai");
                const withoutThinking = cur.lines.filter((l) => l.id !== thinkingId);
                const replyLines = reply.split("\n").map((line) => mkLine("ai-response", line));
                return { ...prev, [tabId]: { ...cur, lines: [...withoutThinking, ...replyLines, mkLine("info", "─────")] } };
            });
        }
        catch (e) {
            setTabStates((prev) => {
                const cur = prev[tabId] ?? initState("ai");
                const withoutThinking = cur.lines.filter((l) => l.id !== thinkingId);
                return { ...prev, [tabId]: { ...cur, lines: [...withoutThinking, mkLine("error", `AI Error: ${String(e)}`)] } };
            });
        }
    }
    async function handleSubmit(tabId: string) {
        const state = tabStates[tabId];
        const input = state?.input?.trim();
        if (!input || state?.running)
            return;
        const type = tabs.find((t) => t.id === tabId)?.type || "shell";
        const newHistory = [input, ...(state.history || []).slice(0, 99)];
        updateState(tabId, { input: "", history: newHistory, histIdx: -1, historyDraft: "" });
        const prompts: Record<TermType, string> = { shell: `[${state.cwd || "/"}]$`, python: ">>>", nodejs: ">", java: "java>", ai: "you>" };
        if (type === "shell" && input === "help") {
            addLine(tabId, "info", "Tip: right-click a file to open it in the terminal or run it directly.");
        }
        addLine(tabId, "input", `${prompts[type]} ${input}`);
        if (input === "clear" || input === "cls") {
            updateState(tabId, { lines: [] });
            return;
        }
        updateState(tabId, { running: true });
        try {
            if (type === "shell")
                await handleShell(tabId, input);
            else if (type === "python" && isWorkspaceCommand(input)) {
                addLine(tabId, "info", "Routing workspace command to SK Shell.");
                await handleShell(tabId, input);
            }
            else if (type === "nodejs" && isWorkspaceCommand(input)) {
                addLine(tabId, "info", "Routing workspace command to SK Shell.");
                await handleShell(tabId, input);
            }
            else if (type === "java" && isWorkspaceCommand(input)) {
                addLine(tabId, "info", "Routing workspace command to SK Shell.");
                await handleShell(tabId, input);
            }
            else if (type === "python")
                await handlePython(tabId, input);
            else if (type === "nodejs")
                await handleNodeJs(tabId, input);
            else if (type === "java")
                await handleJava(tabId, input);
            else if (type === "ai")
                await handleAI(tabId, input);
        }
        finally {
            setTabStates((prev) => prev[tabId] ? { ...prev, [tabId]: { ...prev[tabId], running: false } } : prev);
        }
    }
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, tabId: string) {
        const state = tabStates[tabId];
        if (e.key === "Enter") {
            e.preventDefault();
            void handleSubmit(tabId);
            return;
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!state?.history?.length)
                return;
            const next = Math.min((state?.histIdx ?? -1) + 1, (state?.history?.length ?? 0) - 1);
            updateState(tabId, { histIdx: next, historyDraft: state?.histIdx === -1 ? state.input : state?.historyDraft || "", input: state?.history?.[next] || "" });
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = Math.max((state?.histIdx ?? -1) - 1, -1);
            updateState(tabId, { histIdx: next, input: next === -1 ? state?.historyDraft || "" : state?.history?.[next] || "" });
            return;
        }
        if (e.key === "c" && e.ctrlKey) {
            e.preventDefault();
            terminalSocketsRef.current.get(tabId)?.interrupt();
            addLine(tabId, "info", "^C");
            updateState(tabId, { input: "", running: false });
        }
        if (e.key === "l" && e.ctrlKey) {
            e.preventDefault();
            updateState(tabId, { lines: [] });
        }
        if (e.key === "Tab") {
            e.preventDefault();
            const input = state?.input || "";
            const cwd = state?.cwd || "/";
            const children = getChildrenAt(fileTree, cwd);
            const lastWord = input.split(" ").pop() || "";
            const match = children.find((c) => c.name.startsWith(lastWord));
            if (match) {
                const words = input.split(" ");
                words[words.length - 1] = match.type === "folder" ? match.name + "/" : match.name;
                updateState(tabId, { input: words.join(" ") });
            }
        }
    }
    function sendAccessory(tabId: string, key: "tab" | "up" | "down" | "escape" | "ctrl-c" | "left" | "right") {
        const socket = terminalSocketsRef.current.get(tabId);
        const sequences: Record<typeof key, string> = {
            tab: "\t",
            up: "\u001b[A",
            down: "\u001b[B",
            escape: "\u001b",
            "ctrl-c": "\u0003",
            left: "\u001b[D",
            right: "\u001b[C",
        };
        if (key === "ctrl-c") {
            socket?.interrupt();
            addLine(tabId, "info", "^C");
            updateState(tabId, { input: "", running: false });
            return;
        }
        const state = tabStates[tabId];
        if (key === "up" && !state?.running) {
            if (!state?.history?.length)
                return;
            const next = Math.min((state?.histIdx ?? -1) + 1, (state?.history?.length ?? 0) - 1);
            updateState(tabId, { histIdx: next, historyDraft: state?.histIdx === -1 ? state.input : state?.historyDraft || "", input: state?.history?.[next] || "" });
            inputRef.current?.focus();
            return;
        }
        if (key === "down" && !state?.running) {
            const next = Math.max((state?.histIdx ?? -1) - 1, -1);
            updateState(tabId, { histIdx: next, input: next === -1 ? state?.historyDraft || "" : state?.history?.[next] || "" });
            inputRef.current?.focus();
            return;
        }
        if (socket)
            socket.sendInput(sequences[key]);
        if (key === "tab")
            inputRef.current?.focus();
    }
    const promptLabels: Record<TermType, string> = {
        shell: `${activeState.cwd || "/"}$`,
        python: ">>>",
        nodejs: ">",
        java: "java>",
        ai: "ask>",
    };
    const placeholders: Record<TermType, string> = {
        shell: "Type a command · ↑↓ history · Tab completes",
        python: "print('hello')  • import math  • source only",
        nodejs: "console.log('hello')  • require('fs')  • source only",
        java: "class Main { public static void main(String[] args) { System.out.println(\"hello\"); } }",
        ai: "Ask about the workspace · Enter sends",
    };
    const visibleLines = (() => {
        let unavailableSeen = false;
        return activeState.lines.reduce<TermLine[]>((lines, line) => {
            if (!/isolated runtime service is not available|Oracle Docker workspace is unavailable|Live workspace is unavailable|Workspace session could not start/i.test(line.content)) {
                lines.push(line);
                return lines;
            }
            if (unavailableSeen)
                return lines;
            unavailableSeen = true;
            return lines;
        }, []);
    })();
    return (<div className="multi-terminal">
      <div className="multi-terminal-tabs">
        {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTab;
            const isReady = true;
            const isAiReady = tab.type === "ai" && (aiReady || !!(settings.ai.usePuter || settings.ai.apiKey));
            const isDefault = DEFAULT_TAB_IDS.includes(tab.id);
            return (<div key={tab.id} className={`multi-term-tab ${isActive ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              <span style={{ color: TERM_COLORS[tab.type], display: "flex", alignItems: "center" }}>
                <TermIcon type={tab.type}/>
              </span>
              <span>{tab.label}</span>
              {(isReady || tab.type === "nodejs" || tab.type === "java" || isAiReady) && (<span style={{ width: 5, height: 5, borderRadius: "50%", background: tab.type === "ai" ? "#a78bfa" : "var(--green)", flexShrink: 0 }}/>)}
              {!isDefault && (<button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} style={{ marginLeft: "0.5rem", padding: "0.2rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: "1" }} title="Close terminal">
                  ×
                </button>)}
            </div>);
        })}

        <div ref={addMenuRef} style={{ flexShrink: 0 }}>
          <button ref={addBtnRef} className="term-add-btn" onMouseDown={openAddMenu} title="Add new terminal">+</button>
        </div>

        {showAddMenu && addMenuPos && (<div className="term-add-menu" style={{ position: "fixed", left: addMenuPos.x, top: addMenuPos.y, zIndex: 2000 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="term-add-menu-title">New Terminal</div>
            {ADD_OPTIONS.map((opt) => (<button key={opt.type} className="term-add-option" onMouseDown={(e) => { e.preventDefault(); addNewTab(opt.type); }}>
                <span style={{ color: TERM_COLORS[opt.type] }}><TermIcon type={opt.type}/></span>
                <div>
                  <div style={{ fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{opt.desc}</div>
                </div>
              </button>))}
          </div>)}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: 4, gap: 4 }}>
          {workspaceLifecycle && workspaceSessionIdRef.current && (<>
              <span title={`Workspace expires ${new Date(workspaceLifecycle.expiresAt).toLocaleString()}`} style={{ color: workspaceLifecycle.state === "scheduled-delete" ? "#e3b341" : "var(--green)", fontSize: 10, whiteSpace: "nowrap" }}>
                Workspace · {workspaceLifecycle.retentionMode === "three-days" ? "3 day keep" : "4 hour delete"}
              </span>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: "0.15rem 0.35rem" }} onClick={() => {
                const sessionId = workspaceSessionIdRef.current;
                if (!sessionId)
                    return;
                void setWorkspaceRetention(sessionId, "three-days").then(setWorkspaceLifecycle).catch((error) => addLine(tabs.find((tab) => tab.type === "shell")?.id || activeTab, "error", String(error)));
            }}>Keep 3d</button>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: "0.15rem 0.35rem" }} onClick={() => {
                const sessionId = workspaceSessionIdRef.current;
                if (!sessionId || !window.confirm("Schedule this cloud workspace for deletion four hours after you leave?"))
                    return;
                void setWorkspaceRetention(sessionId, "four-hours").then(setWorkspaceLifecycle).catch((error) => addLine(tabs.find((tab) => tab.type === "shell")?.id || activeTab, "error", String(error)));
            }}>Delete in 4h</button>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: "0.15rem 0.35rem", color: "#f97583" }} onClick={() => {
                const sessionId = workspaceSessionIdRef.current;
                if (!sessionId || !window.confirm("Schedule deletion with a one-hour undo period?"))
                    return;
                void scheduleWorkspaceDelete(sessionId).then(setWorkspaceLifecycle).catch((error) => addLine(tabs.find((tab) => tab.type === "shell")?.id || activeTab, "error", String(error)));
            }}>Delete</button>
            </>)}
          <button className="btn-icon" onClick={() => {
            const tab = tabs.find((item) => item.id === activeTab);
            if (window.confirm(`Clear the history for ${tab?.label ?? "this terminal"}?`))
                clearTerminalHistory(activeTab);
        }} title="Clear terminal">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      {activeType === "shell" && workspaceConnection !== "connected" && (<div className="terminal-workspace-notice" role="status">
          {workspaceConnection === "checking" && "Checking SK Shell connection…"}
          {workspaceConnection === "waiting" && "SK Shell is waiting for the workspace server. You can keep editing files."}
          {workspaceConnection === "offline" && "SK Shell cannot reach the workspace server right now. You can keep editing files."}
        </div>)}

      <div className="terminal-output" ref={outputRef} onScroll={(event) => {
            const target = event.currentTarget;
            stickToOutputEndRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 28;
        }}>
        {visibleLines.map((line) => {
            if (line.type === "ai-thinking") {
                return (<div key={line.id} className="terminal-line info" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#a78bfa", opacity: 0.8 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span style={{ fontStyle: "italic" }}>{line.content}</span>
              </div>);
            }
            if (line.type === "ai-response") {
                const isCode = line.content.startsWith("```") || line.content.startsWith("    ");
                if (line.content === "─────")
                    return <div key={line.id} style={{ borderTop: "1px solid rgba(167,139,250,0.2)", margin: "0.4rem 0" }}/>;
                return (<div key={line.id} style={{
                        fontFamily: isCode ? "var(--font-mono)" : "inherit",
                        fontSize: isCode ? 11 : 12,
                        color: isCode ? "#e2c08d" : "var(--text-primary)",
                        background: isCode ? "rgba(167,139,250,0.06)" : "transparent",
                        borderLeft: isCode ? "2px solid #a78bfa" : "none",
                        paddingLeft: isCode ? "0.5rem" : 0,
                        lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>{line.content}</div>);
            }
            return (<div key={line.id} className={`terminal-line ${line.type}`}>
              <span>{line.content}</span>
            </div>);
        })}
        {activeState.running && activeType !== "ai" && (<div className="terminal-line info" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span>Running...</span>
          </div>)}
      </div>

      {activeType === "shell" && (<div className="terminal-keyboard-row" aria-label="Terminal controls">
          <button onClick={() => sendAccessory(activeTab, "tab")}>Tab</button>
          <button onClick={() => sendAccessory(activeTab, "up")}>↑</button>
          <button onClick={() => sendAccessory(activeTab, "down")}>↓</button>
          <button onClick={() => sendAccessory(activeTab, "left")}>←</button>
          <button onClick={() => sendAccessory(activeTab, "right")}>→</button>
          <button onClick={() => sendAccessory(activeTab, "escape")}>Esc</button>
          <button onClick={() => sendAccessory(activeTab, "ctrl-c")}>Ctrl+C</button>
        </div>)}

      <form className="terminal-input-row" onSubmit={(event) => { event.preventDefault(); void handleSubmit(activeTab); }}>
        <span className="terminal-prompt-label" style={{ color: TERM_COLORS[activeType], fontSize: 11, whiteSpace: "nowrap", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>
          {promptLabels[activeType]}
        </span>
        <input ref={inputRef} className="terminal-input" value={activeState.input} onChange={(e) => updateState(activeTab, { input: e.target.value, histIdx: -1 })} onKeyDown={(e) => handleKeyDown(e, activeTab)} placeholder={placeholders[activeType]} disabled={activeState.running} autoComplete="off" spellCheck={false} aria-label={activeType === "ai" ? "AI Terminal message" : "Terminal command or program input"}/>
        <button type="submit" className="btn btn-primary" style={{ width: 30, padding: 0, fontSize: 15, justifyContent: "center", flexShrink: 0 }} disabled={activeState.running || !activeState.input.trim()} title={activeType === "ai" ? "Ask SK-AI" : "Run command"} aria-label={activeType === "ai" ? "Ask SK-AI" : "Run command"}>
          {activeType === "ai" ? "↑" : "↵"}
        </button>
      </form>

    </div>);
}
