import { useRef, useEffect, useState } from "react"
import { useIDEStore } from "@/store/ideStore"
import { buildPreview } from "@/lib/previewBuilder"
import type { PreviewViewport } from "@/types/ide"

export default function PreviewPane() {
  const { fileTree, previewKey, settings, updatePreviewSettings, getActiveFile, addTerminalLine, previewResult } = useIDEStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [externalUrl, setExternalUrl] = useState("")
  const [liveUrl, setLiveUrl] = useState("")
  const [showExternal, setShowExternal] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const viewport = settings.preview.viewport
  const activeFile = getActiveFile()

  function buildAndSet() {
    if (showExternal) return
    const html = buildPreview(fileTree, activeFile?.path)
    if (iframeRef.current) {
      iframeRef.current.srcdoc = html
      setLoadError(false)
    }
  }

  useEffect(() => {
    buildAndSet()
  }, [previewKey, fileTree, showExternal, activeFile?.path, viewport])

  useEffect(() => {
    function handle(e: MessageEvent) {
      if (e.data?.type === "console") {
        const level = e.data.level || "log"
        const msg = (e.data.args as string[]).join(" ")
        addTerminalLine({ type: level === "error" ? "error" : "output", content: `[preview] ${msg}` })
      }
      if (e.data?.type === "error") {
        addTerminalLine({ type: "error", content: `[preview] ${e.data.message} (line ${e.data.line})` })
      }
    }
    window.addEventListener("message", handle)
    return () => window.removeEventListener("message", handle)
  }, [addTerminalLine])

  function handleRefresh() {
    if (showExternal && iframeRef.current && liveUrl) {
      iframeRef.current.src = liveUrl
    } else {
      buildAndSet()
    }
  }

  function handleGoUrl() {
    const url = externalUrl.trim()
    if (!url) return
    const full = url.startsWith("http") ? url : `https://${url}`
    setLiveUrl(full)
    setShowExternal(true)
    setLoadError(false)
    if (iframeRef.current) {
      iframeRef.current.removeAttribute("srcdoc")
      iframeRef.current.src = full
    }
  }

  function handleOpenExternal() {
    if (showExternal && liveUrl) { window.open(liveUrl, "_blank"); return }
    const html = buildPreview(fileTree, activeFile?.path)
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const viewportConfig: Record<PreviewViewport, { label: string; icon: string; w: string; h: string }> = {
    mobile: { label: "Mobile", icon: "📱", w: "390px", h: "844px" },
    tablet: { label: "Tablet", icon: "📟", w: "768px", h: "1024px" },
    desktop: { label: "Desktop", icon: "🖥", w: "100%", h: "100%" },
  }

  const cfg = viewportConfig[viewport]

  return (
    <div className="preview-panel">
      <div className="preview-toolbar">
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {(["mobile", "tablet", "desktop"] as PreviewViewport[]).map((v) => (
            <button
              key={v}
              className={`preview-viewport-btn ${viewport === v ? "active" : ""}`}
              onClick={() => updatePreviewSettings({ viewport: v })}
              title={`${viewportConfig[v].label} (${viewportConfig[v].w})`}
            >
              {viewportConfig[v].icon}
              <span>{viewportConfig[v].label}</span>
            </button>
          ))}
        </div>

        <div className="preview-url-bar">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="Enter URL to preview..."
            onKeyDown={(e) => e.key === "Enter" && handleGoUrl()}
          />
        </div>

        <button className="btn btn-secondary" onClick={handleGoUrl} style={{ padding: "0.2rem 0.55rem", fontSize: 11, flexShrink: 0 }}>
          Go
        </button>

        {showExternal && (
          <button
            className="btn btn-ghost"
            onClick={() => { setShowExternal(false); setLiveUrl(""); buildAndSet() }}
            style={{ fontSize: 11, padding: "0.2rem 0.4rem", flexShrink: 0 }}
          >
            ✕ Local
          </button>
        )}

        <button className="btn-icon" onClick={handleRefresh} title="Refresh">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>

        <button className="btn-icon" onClick={handleOpenExternal} title="Open in new tab">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
      </div>

      <div className="preview-content-area">
        {previewResult ? (
          <div style={{ width: "100%", height: "100%", background: "#0d1117", fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 13, padding: "1rem", overflowY: "auto", boxSizing: "border-box" }}>
            {previewResult.stdout && (
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#e6edf3" }}>{previewResult.stdout}</pre>
            )}
            {previewResult.stderr && (
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#f97583" }}>{previewResult.stderr}</pre>
            )}
            {!previewResult.stdout && !previewResult.stderr && (
              <span style={{ color: "#8b949e" }}>(no output)</span>
            )}
            <div style={{ marginTop: "0.75rem", color: previewResult.exitCode === 0 ? "#56d364" : "#f97583", fontSize: 11, borderTop: "1px solid #21262d", paddingTop: "0.5rem" }}>
              exit code: {previewResult.exitCode ?? "—"}
            </div>
          </div>
        ) : viewport === "desktop" ? (
          <div className="preview-frame-full">
            <iframe
              ref={iframeRef}
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
              allow="camera; microphone"
              style={{ width: "100%", height: "100%", border: "none", background: "white", display: "block" }}
              onError={() => setLoadError(true)}
            />
          </div>
        ) : (
          <div className="preview-device-wrap">
            <div className={`preview-device-frame ${viewport}`}>
              <div className="preview-device-chrome">
                <div className="preview-device-chrome-inner">
                  {viewport === "mobile" && (
                    <>
                      <div className="preview-device-camera" />
                      <div className="preview-device-speaker" />
                    </>
                  )}
                  {viewport === "tablet" && (
                    <div className="preview-device-camera-tablet" />
                  )}
                </div>
              </div>
              <div className="preview-device-screen">
                <iframe
                  ref={iframeRef}
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
                  allow="camera; microphone"
                  style={{ width: "100%", height: "100%", border: "none", background: "white", display: "block" }}
                  onError={() => setLoadError(true)}
                />
              </div>
              {viewport === "mobile" && <div className="preview-device-home" />}
            </div>
            <div className="preview-device-label">
              {cfg.icon} {cfg.label} — {cfg.w} × {cfg.h.replace("px", "")}px
            </div>
          </div>
        )}

        {loadError && (
          <div className="preview-error-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            This URL blocks embedding. <button onClick={handleOpenExternal} style={{ color: "var(--accent)", textDecoration: "underline", background: "none", cursor: "pointer" }}>Open in browser tab</button>
          </div>
        )}
      </div>
    </div>
  )
}
