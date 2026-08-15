import { useState, useRef, useEffect, useCallback, Fragment } from "react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useIDEStore } from "@/store/ideStore"
import { execute } from "@/lib/executorChain"
import { sendAIMessage, buildSystemPrompt } from "@/lib/aiClient"
import { parseErrors } from "@/components/ide/ErrorPanel"
import { classifyPermissionRequest, formatPermissionLabel, savePermissionGrant, shouldPromptForPermission } from "@/lib/permissionPolicy"
import type { FileNode, AIChatMessage } from "@/types/ide"

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<{
      runPythonAsync: (code: string) => Promise<unknown>
      globals: { get: (k: string) => unknown }
    }>
    _pyodide?: Awaited<ReturnType<NonNullable<Window["loadPyodide"]>>>
    puter?: {
      auth: { signIn: () => Promise<void>; isSignedIn: () => boolean }
      ai: {
        chat: (msgs: { role: string; content: string }[] | string, opts?: { model?: string }) => Promise<{ message: { content: Array<{ text: string }> } }>
      }
    }
  }
}

type TermType = "shell" | "python" | "nodejs" | "ai"

type TermLine = {
  id: string
  type: "input" | "output" | "error" | "info" | "success" | "ai-response" | "ai-thinking"
  content: string
}

type TabDef = {
  id: string
  type: TermType
  label: string
}

type TabState = {
  lines: TermLine[]
  input: string
  history: string[]
  histIdx: number
  cwd: string
  running: boolean
}

function mkLine(type: TermLine["type"], content: string): TermLine {
  return { id: Math.random().toString(36).slice(2), type, content }
}

function initState(type: TermType): TabState {
  const welcomes: Record<TermType, string> = {
    shell: "SK Shell — ls, cd, cat, run, mkdir, touch, help",
    python: "Python 3 — Ready",
    nodejs: "Node.js — Ready",
    ai: "SK AI — Ask questions or get code help",
  }
  return {
    lines: [mkLine("info", welcomes[type])],
    input: "",
    history: [],
    histIdx: -1,
    cwd: "/",
    running: false,
  }
}

let _tabCounter = 10

function nextTabId(type: TermType) {
  return `${type}-${++_tabCounter}`
}



function findNodeAtPath(tree: FileNode[], path: string): FileNode | null {
  for (const n of tree) {
    if (n.path === path) return n
    if (n.children) {
      const found = findNodeAtPath(n.children, path)
      if (found) return found
    }
  }
  return null
}

function getChildrenAt(tree: FileNode[], path: string): FileNode[] {
  if (path === "/" || path === "") return tree
  const node = findNodeAtPath(tree, path)
  return node?.children || []
}

function resolvePath(cwd: string, input: string): string {
  if (!input || input === "~") return "/"
  if (input.startsWith("/")) return input.replace(/\/$/, "") || "/"
  const parts = cwd === "/" ? [] : cwd.split("/").filter(Boolean)
  for (const seg of input.split("/")) {
    if (seg === "..") parts.pop()
    else if (seg !== ".") parts.push(seg)
  }
  return parts.length ? "/" + parts.join("/") : "/"
}

const TERM_COLORS: Record<TermType, string> = {
  shell: "#4eaa25",
  python: "#3572a5",
  nodejs: "#68a063",
  ai: "#a78bfa",
}

const TERM_LABELS: Record<TermType, string> = {
  shell: "SK Shell",
  python: "Python 3",
  nodejs: "Node.js",
  ai: "AI",
}

const ADD_OPTIONS: { type: TermType; label: string; desc: string }[] = [
  { type: "shell", label: "SK Shell", desc: "Workspace filesystem · execute any file" },
  { type: "python", label: "Python 3", desc: "Execute Python code" },
  { type: "nodejs", label: "Node.js", desc: "Execute JavaScript/Node.js code" },
  { type: "ai", label: "AI", desc: "Ask code questions · get help" },
]

function TermIcon({ type }: { type: TermType }) {
  if (type === "shell") return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  )
  if (type === "python") return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C8 2 6 4 6 7v2h6v1H5C3 10 2 11 2 13s1 3 3 4h2v2c0 2 2 3 5 3s5-1 5-3v-2h6c2 0 3-1 3-3s-1-3-3-4h-1V7C22 4 20 2 16 2h-4z"/>
    </svg>
  )
  if (type === "nodejs") return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  )
  if (type === "ai") return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h2a7 7 0 0 1 7 7H2a7 7 0 0 1 7-7h2V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/>
      <rect x="2" y="14" width="20" height="8" rx="2"/>
      <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  )
}

async function ensurePuterForTerm(): Promise<boolean> {
  if (window.puter) return true
  return new Promise((resolve) => {
    const s = document.createElement("script")
    s.src = "https://js.puter.com/v2/"
    s.onload = () => setTimeout(() => resolve(!!window.puter), 400)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

const DEFAULT_TABS: TabDef[] = [
  { id: "shell-1", type: "shell", label: "SK Shell" },
  { id: "python-1", type: "python", label: "Python 3" },
  { id: "nodejs-1", type: "nodejs", label: "Node.js" },
  { id: "ai-1", type: "ai", label: "AI" },
]

const DEFAULT_STATES: Record<string, TabState> = {
  "shell-1": initState("shell"),
  "python-1": initState("python"),
  "nodejs-1": initState("nodejs"),
  "ai-1": initState("ai"),
}

function loadPersistedTerminalState() {
  try {
    const raw = localStorage.getItem("sk-coder-terminal-state-v1")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tabs?: TabDef[]; activeTab?: string; tabStates?: Record<string, TabState> }
    if (!parsed.tabs || !parsed.tabStates) return null
    return parsed
  } catch {
    return null
  }
}

export default function MultiTerminal() {
  const { fileTree, addFile, settings, getActiveFile, setShowSettings, setSettingsTab, terminalBridgeCmd, setTerminalBridgeCmd, setErrors } = useIDEStore()

  const [tabs, setTabs] = useState<TabDef[]>(() => loadPersistedTerminalState()?.tabs ?? DEFAULT_TABS)
  const [activeTab, setActiveTab] = useState(() => loadPersistedTerminalState()?.activeTab ?? "shell-1")
  const [clearTabPending, setClearTabPending] = useState<string | null>(null)
  const [tabStates, setTabStates] = useState<Record<string, TabState>>(() => loadPersistedTerminalState()?.tabStates ?? DEFAULT_STATES)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [aiReady, setAiReady] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)

  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeState = tabStates[activeTab] ?? initState("shell")
  const activeType = tabs.find((t) => t.id === activeTab)?.type ?? "shell"

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [tabStates, activeTab])

  useEffect(() => {
    try {
      localStorage.setItem("sk-coder-terminal-state-v1", JSON.stringify({ tabs, activeTab, tabStates }))
    } catch {
      // ignore storage failures
    }
  }, [tabs, activeTab, tabStates])

  useEffect(() => {
    inputRef.current?.focus()
  }, [activeTab])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    if (showAddMenu) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
    return undefined
  }, [showAddMenu])

  function openAddMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (showAddMenu) {
      setShowAddMenu(false)
      setAddMenuPos(null)
    } else {
      const rect = addBtnRef.current?.getBoundingClientRect()
      if (rect) setAddMenuPos({ x: rect.left, y: rect.bottom + 6 })
      setShowAddMenu(true)
    }
  }

  useEffect(() => {
    if (!terminalBridgeCmd) return
    const targetType = (terminalBridgeCmd.targetType as TermType | undefined) ?? "shell"
    let tab = tabs.find((t) => t.type === targetType)
    let currentTabs = tabs
    let currentStates = tabStates
    if (!tab) {
      const id = nextTabId(targetType)
      const label = TERM_LABELS[targetType] ?? targetType
      const newTab: TabDef = { id, type: targetType, label }
      currentTabs = [...tabs, newTab]
      currentStates = { ...tabStates, [id]: initState(targetType) }
      setTabs(currentTabs)
      setTabStates(currentStates)
      tab = newTab
    }
    const tabId = tab.id
    setActiveTab(tabId)
    const cmds = terminalBridgeCmd.cmds ?? [terminalBridgeCmd.cmd]
    setTerminalBridgeCmd(null)
    let delay = 50
    for (const cmd of cmds) {
      const c = cmd
      const d = delay
      setTimeout(() => {
        addLine(tabId, "input", `$ ${c}`)
        handleShell(tabId, c).catch(() => {})
      }, d)
      delay += 120
    }
  }, [terminalBridgeCmd])

  function updateState(tabId: string, patch: Partial<TabState>) {
    setTabStates((prev) => ({ ...prev, [tabId]: { ...(prev[tabId] ?? initState("shell")), ...patch } }))
  }

  function addLine(tabId: string, type: TermLine["type"], content: string) {
    setTabStates((prev) => {
      const cur = prev[tabId] ?? initState("shell")
      return { ...prev, [tabId]: { ...cur, lines: [...cur.lines.slice(-600), mkLine(type, content)] } }
    })
  }

  function addLines(tabId: string, type: TermLine["type"], text: string) {
    const parts = text.split("\n").filter((l) => l !== "")
    for (const p of parts) addLine(tabId, type, p)
  }

  const DEFAULT_TAB_IDS = ["shell-1", "python-1", "nodejs-1", "ai-1"]

  function clearTab(tabId: string) {
    updateState(tabId, { lines: [] })
  }

  function confirmClearTab(tabId: string) {
    if (DEFAULT_TAB_IDS.includes(tabId)) {
      updateState(tabId, { lines: [], cwd: "/", history: [] })
    } else {
      updateState(tabId, { lines: [] })
    }
    setClearTabPending(null)
  }

  function addNewTab(type: TermType) {
    const id = nextTabId(type)
    const label = TERM_LABELS[type]
    setTabs((prev) => [...prev, { id, type, label }])
    setTabStates((prev) => ({ ...prev, [id]: initState(type) }))
    setActiveTab(id)
    setShowAddMenu(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function closeTab(tabId: string) {
    if (tabs.length === 1) return
    const idx = tabs.findIndex((t) => t.id === tabId)
    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)
    if (activeTab === tabId) {
      setActiveTab(newTabs[Math.max(0, idx - 1)].id)
    }
    setTabStates((prev) => {
      const next = { ...prev }
      delete next[tabId]
      return next
    })
  }

  async function handleShell(tabId: string, input: string) {
    const state = tabStates[tabId]
    const cwd = state?.cwd || "/"
    const parts = input.trim().split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

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
      ]
      for (const l of help) addLine(tabId, "info", l)
      return
    }

    if (cmd === "pwd") { addLine(tabId, "output", cwd); return }

    if (cmd === "ls") {
      const path = args[0] ? resolvePath(cwd, args[0]) : cwd
      const children = getChildrenAt(fileTree, path)
      if (children.length === 0) {
        addLine(tabId, "info", "(empty directory)")
      } else {
        const dirs = children.filter((c) => c.type === "folder").map((c) => c.name + "/")
        const fils = children.filter((c) => c.type === "file").map((c) => c.name)
        if (dirs.length) addLine(tabId, "output", dirs.join("  "))
        if (fils.length) addLine(tabId, "output", fils.join("  "))
      }
      return
    }

    if (cmd === "cd") {
      const target = resolvePath(cwd, args[0] || "/")
      if (target === "/") { updateState(tabId, { cwd: "/" }); return }
      const node = findNodeAtPath(fileTree, target)
      if (!node || node.type !== "folder") { addLine(tabId, "error", `cd: ${args[0]}: No such directory`); return }
      updateState(tabId, { cwd: target })
      return
    }

    if (cmd === "cat") {
      if (!args[0]) { addLine(tabId, "error", "cat: missing file operand"); return }
      const path = resolvePath(cwd, args[0])
      const node = findNodeAtPath(fileTree, path)
      if (!node || node.type === "folder") { addLine(tabId, "error", `cat: ${args[0]}: No such file`); return }
      addLines(tabId, "output", node.content || "(empty file)")
      return
    }

    if (cmd === "echo") { addLine(tabId, "output", args.join(" ")); return }

    if (cmd === "mkdir") {
      if (!args[0]) { addLine(tabId, "error", "mkdir: missing operand"); return }
      addFile(cwd, args[0].replace(/[/\\]/g, ""), "folder")
      addLine(tabId, "success", `Created folder: ${args[0]}`)
      return
    }

    if (cmd === "touch") {
      if (!args[0]) { addLine(tabId, "error", "touch: missing operand"); return }
      addFile(cwd, args[0], "file", "")
      addLine(tabId, "success", `Created file: ${args[0]}`)
      return
    }

    if (cmd === "run" || cmd === "python" || cmd === "node") {
      const filename = args[0]
      if (!filename) { addLine(tabId, "error", `${cmd}: specify a filename`); return }
      const path = resolvePath(cwd, filename)
      const node = findNodeAtPath(fileTree, path)
      if (!node || node.type === "folder") { addLine(tabId, "error", `${cmd}: ${filename}: No such file`); return }
      const code = node.content || ""
      const ext = filename.split(".").pop()?.toLowerCase() || ""
      updateState(tabId, { running: true })
      addLine(tabId, "info", `Running ${filename}...`)

      if (cmd === "python" || (cmd === "run" && ext === "py")) {
        await handlePython(tabId, code)
      } else if (cmd === "node" || (cmd === "run" && ["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext))) {
        await handleNodeJs(tabId, code)
      } else if (cmd === "run") {
        const res = await execute(ext, code)
        if (res.stdout) addLines(tabId, "output", res.stdout.trimEnd())
        if (res.stderr) addLines(tabId, "error", res.stderr.trimEnd())
        if (!res.stdout && !res.stderr) addLine(tabId, "info", "(no output)")
      } else {
        addLine(tabId, "error", `Cannot run .${ext} files`)
      }
      updateState(tabId, { running: false })
      return
    }

    addLine(tabId, "error", `${cmd}: command not found. Type 'help' for available commands.`)
  }

  async function handlePython(tabId: string, code: string) {
    const res = await execute("python", code)
    if (res.stdout) addLines(tabId, "output", res.stdout.trimEnd())
    if (res.stderr) {
      addLines(tabId, "error", res.stderr.trimEnd())
      const errs = parseErrors(res.stderr)
      if (errs.length) setErrors(errs)
    }
    if (!res.stdout && !res.stderr) addLine(tabId, "info", "(no output)")
    if (res.executionTime > 0) addLine(tabId, "info", `⏱ ${res.executionTime}ms | exit ${res.exitCode}`)
  }

  async function handleNodeJs(tabId: string, code: string) {
    const state = tabStates[tabId]
    const cwd = state?.cwd || "/"
    const trimmed = code.trim()
    const runMatch = trimmed.match(/^(?:run|node)\s+(\S+)/)
    let execCode = trimmed
    if (runMatch) {
      const filename = runMatch[1]
      const path = resolvePath(cwd, filename)
      const node = findNodeAtPath(fileTree, path)
      if (!node || node.type === "folder") {
        addLine(tabId, "error", `run: ${filename}: No such file`)
        return
      }
      addLine(tabId, "info", `Running ${filename}...`)
      execCode = node.content || ""
    }
    const res = await execute("node", execCode)
    if (res.stdout) addLines(tabId, "output", res.stdout.trimEnd())
    if (res.stderr) addLines(tabId, "error", res.stderr.trimEnd())
    if (!res.stdout && !res.stderr) addLine(tabId, "info", "(no output)")
    if (res.executionTime > 0) addLine(tabId, "info", `⏱ ${res.executionTime}ms | exit ${res.exitCode}`)
  }

  async function handleAI(tabId: string, question: string) {
    const { apiKey, usePuter, keyStatus, autoContext } = settings.ai
    const action = classifyPermissionRequest(question)
    const scope = getActiveFile()?.path || "the current workspace"
    if (action && shouldPromptForPermission(action, scope, true)) {
      addLine(tabId, "info", `Permission requested for ${formatPermissionLabel(action)} on ${scope}`)
      addLine(tabId, "info", "Tip: allow once for this request or continue with read-only questions.")
      savePermissionGrant(action, scope)
    }
    const hasKey = usePuter || (apiKey && keyStatus === "valid")
    if (!hasKey) {
      addLine(tabId, "error", "No AI configured — go to Settings → AI to add a key or enable Free Puter AI")
      setSettingsTab("ai")
      setShowSettings(true)
      return
    }
    const thinkingId = Math.random().toString(36).slice(2)
    setTabStates((prev) => {
      const cur = prev[tabId] ?? initState("ai")
      return { ...prev, [tabId]: { ...cur, lines: [...cur.lines, { id: thinkingId, type: "ai-thinking" as const, content: "Thinking..." }] } }
    })
    const activeFile = getActiveFile()
    const systemPrompt = buildSystemPrompt({ activeFilePath: activeFile?.path, activeFileContent: autoContext ? activeFile?.content : undefined, fileTree: [] })
    try {
      let reply = ""
      if (usePuter) {
        const ok = await ensurePuterForTerm()
        if (!ok) { reply = "Puter.js failed to load. Check your internet." }
        else {
          if (!window.puter!.auth.isSignedIn()) await window.puter!.auth.signIn()
          const resp = await window.puter!.ai.chat(`${systemPrompt}\n\nUser: ${question}`) as unknown
          const raw = resp as { message?: { content?: unknown } }
          const c = raw?.message?.content
          reply = typeof c === "string" ? c : Array.isArray(c) ? ((c[0] as { text?: string })?.text ?? String(c[0] ?? "")) : typeof resp === "string" ? (resp as string) : String(c ?? "")
          if (!reply.trim()) reply = "SK-AI returned an empty response. Try rephrasing."
          setAiReady(true)
        }
      } else {
        const messages: AIChatMessage[] = [{ id: "q", role: "user", content: question, timestamp: Date.now() }]
        const res = await sendAIMessage({ key: apiKey, customEndpoint: settings.ai.apiEndpoint, customModel: settings.ai.model, messages, systemPrompt })
        if (res.error) reply = `Error: ${res.error}`
        else reply = res.content || "(no response)"
      }
      setTabStates((prev) => {
        const cur = prev[tabId] ?? initState("ai")
        const withoutThinking = cur.lines.filter((l) => l.id !== thinkingId)
        const replyLines = reply.split("\n").map((line) => mkLine("ai-response", line))
        return { ...prev, [tabId]: { ...cur, lines: [...withoutThinking, ...replyLines, mkLine("info", "─────")] } }
      })
    } catch (e) {
      setTabStates((prev) => {
        const cur = prev[tabId] ?? initState("ai")
        const withoutThinking = cur.lines.filter((l) => l.id !== thinkingId)
        return { ...prev, [tabId]: { ...cur, lines: [...withoutThinking, mkLine("error", `AI Error: ${String(e)}`)] } }
      })
    }
  }

  async function handleSubmit(tabId: string) {
    const state = tabStates[tabId]
    const input = state?.input?.trim()
    if (!input || state?.running) return
    const type = tabs.find((t) => t.id === tabId)?.type || "shell"
    const newHistory = [input, ...(state.history || []).slice(0, 99)]
    updateState(tabId, { input: "", history: newHistory, histIdx: -1 })
    const prompts: Record<TermType, string> = { shell: `[${state.cwd || "/"}]$`, python: ">>>", nodejs: ">", ai: "you>" }
    if (type === "shell" && input === "help") {
      addLine(tabId, "info", "Tip: right-click a file to open it in the terminal or run it directly.")
    }
    addLine(tabId, "input", `${prompts[type]} ${input}`)
    if (input === "clear" || input === "cls") { updateState(tabId, { lines: [] }); return }
    updateState(tabId, { running: true })
    try {
      if (type === "shell") await handleShell(tabId, input)
      else if (type === "python") await handlePython(tabId, input)
      else if (type === "nodejs") await handleNodeJs(tabId, input)
      else if (type === "ai") await handleAI(tabId, input)
    } finally {
      setTabStates((prev) => prev[tabId] ? { ...prev, [tabId]: { ...prev[tabId], running: false } } : prev)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, tabId: string) {
    const state = tabStates[tabId]
    if (e.key === "Enter") { handleSubmit(tabId); return }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.min((state?.histIdx ?? -1) + 1, (state?.history?.length ?? 0) - 1)
      updateState(tabId, { histIdx: next, input: state?.history?.[next] || "" })
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.max((state?.histIdx ?? -1) - 1, -1)
      updateState(tabId, { histIdx: next, input: next === -1 ? "" : state?.history?.[next] || "" })
      return
    }
    if (e.key === "c" && e.ctrlKey) { addLine(tabId, "info", "^C"); updateState(tabId, { input: "", running: false }) }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); updateState(tabId, { lines: [] }) }
    if (e.key === "Tab") {
      e.preventDefault()
      const input = state?.input || ""
      const cwd = state?.cwd || "/"
      const children = getChildrenAt(fileTree, cwd)
      const lastWord = input.split(" ").pop() || ""
      const match = children.find((c) => c.name.startsWith(lastWord))
      if (match) {
        const words = input.split(" ")
        words[words.length - 1] = match.type === "folder" ? match.name + "/" : match.name
        updateState(tabId, { input: words.join(" ") })
      }
    }
  }

  const promptLabels: Record<TermType, string> = {
    shell: `${activeState.cwd || "/"}$`,
    python: ">>>",
    nodejs: ">",
    ai: "ask>",
  }

  const placeholders: Record<TermType, string> = {
    shell: "ls · cd <dir> · run <file> · mkdir · help  (↑↓ history, Tab complete)",
    python: "print('hello')  • import math  • any Python 3 code",
    nodejs: "console.log('hello')  • require('fs')  • any Node.js code",
    ai: "Ask a coding question or request help with code",
  }

  return (
    <div className="multi-terminal">
      <div className="multi-terminal-tabs">
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTab
              const isReady = true
          const isAiReady = tab.type === "ai" && (aiReady || !!(settings.ai.usePuter || settings.ai.apiKey))
          const isDefault = DEFAULT_TAB_IDS.includes(tab.id)
          return (
            <div
              key={tab.id}
              className={`multi-term-tab ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={{ color: TERM_COLORS[tab.type], display: "flex", alignItems: "center" }}>
                <TermIcon type={tab.type} />
              </span>
              <span>{tab.label}</span>
              {(isReady || tab.type === "nodejs" || tab.type === "java" || isAiReady) && (
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: tab.type === "ai" ? "#a78bfa" : "var(--green)", flexShrink: 0 }} />
              )}
              {!isDefault && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  style={{ marginLeft: "0.5rem", padding: "0.2rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: "1" }}
                  title="Close terminal"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}

        <div ref={addMenuRef} style={{ flexShrink: 0 }}>
          <button
            ref={addBtnRef}
            className="term-add-btn"
            onMouseDown={openAddMenu}
            title="Add new terminal"
          >+</button>
        </div>

        {showAddMenu && addMenuPos && (
          <div
            className="term-add-menu"
            style={{ position: "fixed", left: addMenuPos.x, top: addMenuPos.y, zIndex: 2000 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="term-add-menu-title">New Terminal</div>
            {ADD_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                className="term-add-option"
                onMouseDown={(e) => { e.preventDefault(); addNewTab(opt.type) }}
              >
                <span style={{ color: TERM_COLORS[opt.type] }}><TermIcon type={opt.type} /></span>
                <div>
                  <div style={{ fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: 4, gap: 2 }}>
          <button className="btn-icon" onClick={() => setClearTabPending(activeTab)} title="Clear terminal">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="terminal-output" ref={outputRef} onClick={() => inputRef.current?.focus()}>
        {activeState.lines.map((line) => {
          if (line.type === "ai-thinking") {
            return (
              <div key={line.id} className="terminal-line info" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#a78bfa", opacity: 0.8 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span style={{ fontStyle: "italic" }}>{line.content}</span>
              </div>
            )
          }
          if (line.type === "ai-response") {
            const isCode = line.content.startsWith("```") || line.content.startsWith("    ")
            if (line.content === "─────") return <div key={line.id} style={{ borderTop: "1px solid rgba(167,139,250,0.2)", margin: "0.4rem 0" }} />
            return (
              <div key={line.id} style={{
                fontFamily: isCode ? "var(--font-mono)" : "inherit",
                fontSize: isCode ? 11 : 12,
                color: isCode ? "#e2c08d" : "var(--text-primary)",
                background: isCode ? "rgba(167,139,250,0.06)" : "transparent",
                borderLeft: isCode ? "2px solid #a78bfa" : "none",
                paddingLeft: isCode ? "0.5rem" : 0,
                lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>{line.content}</div>
            )
          }
          return (
            <div key={line.id} className={`terminal-line ${line.type}`}>
              <span>{line.content}</span>
            </div>
          )
        })}
        {activeState.running && activeType !== "ai" && (
          <div className="terminal-line info" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span>Running...</span>
          </div>
        )}
      </div>

      <div className="terminal-input-row">
        <span className="terminal-prompt-label" style={{ color: TERM_COLORS[activeType], fontSize: 11, whiteSpace: "nowrap", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>
          {promptLabels[activeType]}
        </span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={activeState.input}
          onChange={(e) => updateState(activeTab, { input: e.target.value })}
          onKeyDown={(e) => handleKeyDown(e, activeTab)}
          placeholder={placeholders[activeType]}
          disabled={activeState.running}
          autoComplete="off"
          spellCheck={false}
          style={{ width: "auto", border: "none", padding: 0, background: "transparent" }}
        />
        <button
          className="btn btn-primary"
          style={{ padding: "0.2rem 0.6rem", fontSize: 11, flexShrink: 0 }}
          onClick={() => handleSubmit(activeTab)}
          disabled={activeState.running || !activeState.input.trim()}
        >
          Run
        </button>
      </div>

      <AlertDialog open={clearTabPending !== null} onOpenChange={(open) => { if (!open) setClearTabPending(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this terminal's history?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearTabPending && confirmClearTab(clearTabPending)}>
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
