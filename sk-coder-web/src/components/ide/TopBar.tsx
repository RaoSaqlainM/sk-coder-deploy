import { useIDEStore } from "@/store/ideStore"
import logoIcon from "@/assets/logo-icon.png"
import { buildPreview } from "@/lib/previewBuilder"
import { unifiedExecute, getFileExtension } from "@/lib/unifiedExecutor"
import { toast } from "sonner"
import { parseErrors } from "@/components/ide/ErrorPanel"

export default function TopBar() {
  const {
    isRunning, setIsRunning, fileTree, activeTabId,
    addTerminalLine, clearTerminal, setActivePanel, setShowSettings, getActiveFile,
    setPreviewContent, setErrors, setPreviewResult,
  } = useIDEStore()

  const activeFile = getActiveFile()

  async function handleRun() {
    if (isRunning) {
      setIsRunning(false)
      addTerminalLine({ type: "info", content: "Execution stopped." })
      return
    }

    if (!activeFile) {
      toast.error("Open a file first")
      return
    }

    const ext = getFileExtension(activeFile.name)
    const code = activeFile.content || ""

    if (["html", "htm"].includes(ext)) {
      const html = buildPreview(fileTree, activeFile.path)
      setPreviewResult(null)
      setPreviewContent(html)
      setActivePanel("preview")
      toast.success("Preview ready")
      return
    }

    setActivePanel("preview")
    clearTerminal()
    setErrors([])
    setIsRunning(true)
    setPreviewResult(null)
    addTerminalLine({ type: "info", content: `▶ Running ${activeFile.name}...` })

    try {
      const result = await unifiedExecute(ext, code)

      if (!result) {
        addTerminalLine({ type: "error", content: `No executor available for .${ext}` })
        setIsRunning(false)
        return
      }

      addTerminalLine({ type: "info", content: `Runtime: ${result.executor} — ${result.capability}` })

      if (result.stdout) {
        for (const line of result.stdout.split("\n")) {
          if (line.trim()) addTerminalLine({ type: "output", content: line })
        }
      }

      if (result.stderr) {
        for (const line of result.stderr.split("\n")) {
          if (line.trim()) addTerminalLine({ type: "error", content: line })
        }
        const errors = parseErrors(result.stderr, activeFile.name)
        if (errors.length) setErrors(errors)
      }

      if (!result.stdout && !result.stderr) {
        addTerminalLine({ type: "info", content: "(no output)" })
      }

      addTerminalLine({
        type: result.exitCode === 0 ? "success" : "error",
        content: `✓ Done ⏱ ${result.executionTime}ms exit ${result.exitCode}`,
      })

      setPreviewResult({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        tier: result.executor,
        capability: result.capability,
        executionTime: result.executionTime,
      })
    } finally {
      setIsRunning(false)
    }
  }

  const ext = activeFile?.name.split(".").pop()?.toLowerCase() || ""
  const previewable = ["html", "htm", "css", "js", "jsx", "ts", "tsx"].includes(ext)
  const runLabel = previewable ? "Preview" : "Run"

  return (
    <div className="ide-topbar">
      <div className="topbar-logo">
        <img className="topbar-logo-image" src={logoIcon} alt="SK Coder logo" />
        <div className="topbar-brand-stack">
          <span>SK Coder</span>
        </div>
      </div>

      {activeFile && (
        <>
          <div className="topbar-divider" />
          <span className="topbar-breadcrumb">
            {activeFile.name}
          </span>
        </>
      )}

      <div className="topbar-actions">
        <button
          className={`topbar-run-btn${isRunning ? " running" : ""}${!activeFile && !isRunning ? " disabled" : ""}`}
          onClick={handleRun}
          title={isRunning ? "Stop execution" : activeFile ? `${runLabel} ${activeFile.name}` : "Open a file to run"}
          style={{ opacity: !activeFile && !isRunning ? 0.5 : 1 }}
        >
          {isRunning ? (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="2" width="3" height="8" rx="1"/>
              <rect x="7" y="2" width="3" height="8" rx="1"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <polygon points="2,1 11,6 2,11"/>
            </svg>
          )}
          {isRunning ? "Stop" : runLabel}
        </button>

        <button className="btn-icon" onClick={() => setShowSettings(true)} title="Settings">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
