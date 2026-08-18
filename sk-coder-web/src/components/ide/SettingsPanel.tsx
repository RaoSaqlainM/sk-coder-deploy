import { useRef, useState } from "react"
import { useIDEStore } from "@/store/ideStore"
import { validateGitHubToken } from "@/lib/githubClient"
import { toast } from "sonner"
import developerPortrait from "@/assets/saqlain-developer.jpg"

type ToggleProps = { checked: boolean; onChange: (v: boolean) => void }
function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" />
    </label>
  )
}

type NavItem = { id: string; label: string; icon: React.ReactNode }

const NAV: NavItem[] = [
  {
    id: "editor", label: "Editor",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  },
  {
    id: "ai", label: "SK-AI",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 9h.01M15 9h.01M9 15h6"/></svg>,
  },
  {
    id: "github", label: "GitHub",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>,
  },
  {
    id: "preview", label: "Preview",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  },
  {
    id: "about", label: "About",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
]

declare global {
  interface Window {
    puter?: {
      auth: { signIn: () => Promise<void>; isSignedIn: () => boolean }
      ai: {
        chat: (msgs: { role: string; content: string }[] | string, opts?: { model?: string }) => Promise<{ message: { content: Array<{ text: string }> } }>
      }
    }
  }
}

async function loadPuter(): Promise<typeof window.puter> {
  if (window.puter) return window.puter
  return new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "https://js.puter.com/v2/"
    s.onload = () => resolve(window.puter)
    s.onerror = () => reject(new Error("Failed to load Puter.js"))
    document.head.appendChild(s)
  })
}

async function testApiKey(key: string): Promise<"valid" | "invalid" | "expired"> {
  try {
    let url = ""
    let model = ""
    if (key.startsWith("sk-ant-")) {
      url = "https://api.anthropic.com/v1/messages"
      const r = await fetch(url, {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 5, messages: [{ role: "user", content: "hi" }] }),
      })
      if (r.status === 401 || r.status === 403) return "invalid"
      if (r.status === 429) return "expired"
      return r.ok ? "valid" : "invalid"
    }
    if (key.startsWith("AIza")) {
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }) })
      if (r.status === 400 || r.status === 403) return "invalid"
      return r.ok ? "valid" : "invalid"
    }
    url = "https://api.openai.com/v1/chat/completions"
    model = "gpt-3.5-turbo"
    if (key.startsWith("sk-or-")) {
      url = "https://openrouter.ai/api/v1/chat/completions"
      model = "openai/gpt-3.5-turbo"
    } else if (key.startsWith("gsk_")) {
      url = "https://api.groq.com/openai/v1/chat/completions"
      model = "llama3-8b-8192"
    }
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: "user", content: "hi" }] }),
    })
    if (r.status === 401 || r.status === 403) return "invalid"
    if (r.status === 429) return "expired"
    return r.ok ? "valid" : "invalid"
  } catch {
    return "invalid"
  }
}

export default function SettingsPanel() {
  const {
    settings, settingsTab, setSettingsTab, setShowSettings,
    updateEditorSettings, updateAISettings,
    updateGithubSettings, updatePreviewSettings,
  } = useIDEStore()

  const [keyInput, setKeyInput] = useState(settings.ai.apiKey)
  const [tokenInput, setTokenInput] = useState(settings.github.token)
  const [showKey, setShowKey] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [checking, setChecking] = useState(false)
  const [puterConnecting, setPuterConnecting] = useState(false)
  const [puterConnected, setPuterConnected] = useState(() => {
    try { return !!window.puter?.auth?.isSignedIn() } catch { return false }
  })
  const [developerPhoto, setDeveloperPhoto] = useState(() => localStorage.getItem("sk-coder-developer-photo") || developerPortrait)
  const developerPhotoInputRef = useRef<HTMLInputElement>(null)

  async function handleConnectKey() {
    if (!keyInput.trim()) { toast.error("Paste your API key first"); return }
    setChecking(true)
    try {
      const status = await testApiKey(keyInput.trim())
      if (status === "valid") {
        updateAISettings({ apiKey: keyInput.trim(), keyStatus: "valid", usePuter: false })
        toast.success("SK-AI connected!")
      } else if (status === "expired") {
        updateAISettings({ apiKey: keyInput.trim(), keyStatus: "expired" })
        toast.error("Key has no remaining credits")
      } else {
        updateAISettings({ keyStatus: "invalid" })
        toast.error("Invalid API key — try again")
      }
    } finally {
      setChecking(false)
    }
  }

  async function handleConnectPuter() {
    setPuterConnecting(true)
    try {
      const puter = await loadPuter()
      if (!puter) { toast.error("Failed to load Puter.js"); return }
      if (!puter.auth.isSignedIn()) {
        await puter.auth.signIn()
      }
      if (puter.auth.isSignedIn()) {
        setPuterConnected(true)
        updateAISettings({ usePuter: true })
        toast.success("Free SK-AI connected via Puter!")
      }
    } catch {
      toast.error("Puter sign-in was cancelled or failed")
    } finally {
      setPuterConnecting(false)
    }
  }

  async function handleValidateToken() {
    if (!tokenInput.trim()) { toast.error("Paste your GitHub token first"); return }
    const { valid, username } = await validateGitHubToken(tokenInput.trim())
    if (valid) {
      updateGithubSettings({ token: tokenInput.trim(), username })
      toast.success(`Connected as @${username}`)
    } else {
      toast.error("Invalid GitHub token")
    }
  }

  function handleClearApiKey() {
    setKeyInput("")
    updateAISettings({ apiKey: "", keyStatus: "none" })
    toast.success("Your API key was removed from this browser")
  }

  function handleDisconnectGitHub() {
    setTokenInput("")
    updateGithubSettings({ token: "", username: "", codespaceActive: "" })
    toast.success("GitHub was disconnected from this browser")
  }

  function requestDeveloperPhotoChange() {
    if (window.prompt("Enter the local edit code") !== "0") {
      toast.error("Edit code did not match")
      return
    }
    developerPhotoInputRef.current?.click()
  }

  function changeDeveloperPhoto(file: File | undefined) {
    if (!file?.type.startsWith("image/")) {
      toast.error("Choose an image file")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : ""
      if (!value) return
      try {
        localStorage.setItem("sk-coder-developer-photo", value)
        setDeveloperPhoto(value)
        toast.success("Developer photo updated in this browser")
      } catch {
        toast.error("This image is too large to save in this browser")
      }
    }
    reader.readAsDataURL(file)
  }

  const keyStatus = settings.ai.keyStatus

  return (
    <div className="settings-overlay" onClick={() => setShowSettings(false)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <h2>Settings</h2>
          </div>
          <button className="btn-icon" onClick={() => setShowSettings(false)} title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="settings-body">
          <nav className="settings-nav">
            {NAV.map((item) => (
              <div
                key={item.id}
                className={`settings-nav-item ${settingsTab === item.id ? "active" : ""}`}
                onClick={() => setSettingsTab(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="settings-content">

            {settingsTab === "editor" && (
              <>
                <div className="settings-section">
                  <div className="settings-section-title">Appearance</div>
                  <div className="settings-row">
                    <label>Font Size</label>
                    <input
                      type="number" min={10} max={24} style={{ maxWidth: 70 }}
                      value={settings.editor.fontSize}
                      onChange={(e) => updateEditorSettings({ fontSize: Number(e.target.value) })}
                    />
                  </div>
                  <div className="settings-row">
                    <label>Font Family</label>
                    <select value={settings.editor.fontFamily} onChange={(e) => updateEditorSettings({ fontFamily: e.target.value })} style={{ maxWidth: 190 }}>
                      <option value="'JetBrains Mono', 'Fira Code', monospace">JetBrains Mono</option>
                      <option value="'Fira Code', monospace">Fira Code</option>
                      <option value="'Cascadia Code', monospace">Cascadia Code</option>
                      <option value="'Courier New', monospace">Courier New</option>
                      <option value="monospace">System Mono</option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <label>Tab Size</label>
                    <select style={{ maxWidth: 80 }} value={settings.editor.tabSize} onChange={(e) => updateEditorSettings({ tabSize: Number(e.target.value) })}>
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                      <option value={8}>8 spaces</option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <label>Cursor Style</label>
                    <select style={{ maxWidth: 110 }} value={settings.editor.cursorStyle} onChange={(e) => updateEditorSettings({ cursorStyle: e.target.value as "line" | "block" | "underline" })}>
                      <option value="line">Line</option>
                      <option value="block">Block</option>
                      <option value="underline">Underline</option>
                    </select>
                  </div>
                </div>
                <div className="settings-section">
                  <div className="settings-section-title">Behavior</div>
                  <div className="settings-row"><label>Word Wrap</label><Toggle checked={settings.editor.wordWrap === "on"} onChange={(v) => updateEditorSettings({ wordWrap: v ? "on" : "off" })} /></div>
                  <div className="settings-row"><label>Minimap</label><Toggle checked={settings.editor.minimap} onChange={(v) => updateEditorSettings({ minimap: v })} /></div>
                  <div className="settings-row"><label>Line Numbers</label><Toggle checked={settings.editor.lineNumbers === "on"} onChange={(v) => updateEditorSettings({ lineNumbers: v ? "on" : "off" })} /></div>
                  <div className="settings-row"><label>Auto Save</label><Toggle checked={settings.editor.autoSave} onChange={(v) => updateEditorSettings({ autoSave: v })} /></div>
                  <div className="settings-row"><label>Bracket Colors</label><Toggle checked={settings.editor.bracketPairs} onChange={(v) => updateEditorSettings({ bracketPairs: v })} /></div>
                  <div className="settings-row"><label>Smooth Scroll</label><Toggle checked={settings.editor.smoothScrolling} onChange={(v) => updateEditorSettings({ smoothScrolling: v })} /></div>
                </div>
              </>
            )}

            {settingsTab === "ai" && (
              <>
                <div className="settings-section">
                  <div className="settings-section-title">Free SK-AI</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                    Use SK-AI for free. Sign in once and stay connected across sessions.
                  </div>
                  {puterConnected || settings.ai.usePuter ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.75rem", background: "rgba(40, 167, 69, 0.12)", border: "1px solid rgba(40, 167, 69, 0.3)", borderRadius: "var(--radius)", marginBottom: "0.5rem" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>Free SK-AI connected via Puter</span>
                      <button className="btn btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "0.15rem 0.5rem" }}
                        onClick={() => { setPuterConnected(false); updateAISettings({ usePuter: false }) }}>
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={handleConnectPuter}
                      disabled={puterConnecting}
                      style={{ width: "100%", justifyContent: "center", marginBottom: "0.5rem" }}
                    >
                      {puterConnecting ? "Connecting..." : "Connect Free SK-AI (via Puter)"}
                    </button>
                  )}
                  <div className="settings-hint">Puter gives free access to AI models — no credit card required. Your session stays active until you log out from puter.com.</div>
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">Your Own API Key</div>
                  <div className="settings-row col">
                    <label>API Key</label>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", width: "100%" }}>
                      <input
                        type={showKey ? "text" : "password"}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="Paste your API key here..."
                        style={{ fontFamily: "var(--font-code)", fontSize: 11, flex: 1 }}
                        onKeyDown={(e) => e.key === "Enter" && handleConnectKey()}
                      />
                      <button className="btn btn-ghost" style={{ padding: "0.25rem 0.5rem", flexShrink: 0 }} onClick={() => setShowKey(!showKey)}>
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem" }}>
                    {keyStatus === "valid" && <span style={{ fontSize: 12, color: "var(--green)" }}>✓ Connected</span>}
                    {keyStatus === "invalid" && <span style={{ fontSize: 12, color: "var(--red)" }}>✗ Invalid key</span>}
                    {keyStatus === "expired" && <span style={{ fontSize: 12, color: "var(--orange)" }}>⚠ Credits used up</span>}
                    {(keyStatus === "none" || keyStatus === "checking") && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{checking ? "Checking..." : "Not connected"}</span>}
                    <button
                      className="btn btn-primary"
                      onClick={handleConnectKey}
                      disabled={checking || !keyInput.trim()}
                    >
                      {checking ? "Checking..." : "Connect"}
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <span className="settings-hint" style={{ margin: 0 }}>Stored only in this browser until you remove it.</span>
                    {!!settings.ai.apiKey && <button className="btn btn-ghost" onClick={handleClearApiKey} style={{ fontSize: 11, padding: "0.2rem 0.45rem" }}>Remove key</button>}
                  </div>
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">Behavior</div>
                  <div className="settings-row">
                    <label>Auto-attach file context</label>
                    <Toggle checked={settings.ai.autoContext} onChange={(v) => updateAISettings({ autoContext: v })} />
                  </div>
                  <div className="settings-hint">When on, the open file is sent with every message so SK-AI understands your code.</div>
                </div>
              </>
            )}

            {settingsTab === "github" && (
              <>
                <div className="settings-section">
                  <div className="settings-section-title">Personal Access Token</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                    Use a fine-grained token when possible. Limit it to selected repositories and grant Contents read or write only as needed. Add Codespaces read or write only when you manage Codespaces.
                  </div>
                  {settings.github.username && (
                    <div className="settings-key-status valid" style={{ marginBottom: "0.75rem" }}>
                      ✓ Connected as @{settings.github.username}
                    </div>
                  )}
                  <div className="settings-row col">
                    <label>GitHub Token</label>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", width: "100%" }}>
                      <input
                        type={showToken ? "text" : "password"}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="github_pat_... or ghp_..."
                        style={{ fontFamily: "var(--font-code)", fontSize: 11, flex: 1 }}
                      />
                      <button className="btn btn-ghost" style={{ padding: "0.25rem 0.5rem", flexShrink: 0 }} onClick={() => setShowToken(!showToken)}>
                        {showToken ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                    <button className="btn btn-primary" onClick={handleValidateToken}>Connect GitHub</button>
                    {!!settings.github.token && <button className="btn btn-ghost" onClick={handleDisconnectGitHub}>Disconnect</button>}
                    <a href="https://github.com/settings/personal-access-tokens/new?name=SK-Coder&description=Selected+repository+access" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                      Create Token →
                    </a>
                  </div>
                  <div className="settings-hint">Your token stays in this browser’s local workspace state. It is sent to GitHub only when you choose a GitHub action, and Disconnect removes it here.</div>
                </div>
              </>
            )}

            {settingsTab === "preview" && (
              <>
                <div className="settings-section">
                  <div className="settings-section-title">Live Preview</div>
                  <div className="settings-row">
                    <label>Default Viewport</label>
                    <select value={settings.preview.viewport} onChange={(e) => updatePreviewSettings({ viewport: e.target.value as "mobile" | "tablet" | "desktop" })} style={{ maxWidth: 130 }}>
                      <option value="mobile">Mobile (390px)</option>
                      <option value="tablet">Tablet (768px)</option>
                      <option value="desktop">Desktop (Full)</option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <label>Auto Refresh on Save</label>
                    <Toggle checked={settings.preview.autoRefresh} onChange={(v) => updatePreviewSettings({ autoRefresh: v })} />
                  </div>
                </div>
              </>
            )}

            {settingsTab === "about" && (
              <>
                <div className="settings-section">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background: "rgba(137, 180, 250, 0.16)", color: "var(--accent)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="3" />
                        <path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>SK Coder IDE</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Version 3.0.0 — by Saqlain King</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "0.5rem" }}>
                    SK Coder is a mobile-first web IDE for writing, organizing, running, and reviewing code from one workspace.
                  </p>
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">User Guide</div>
                  {[
                    { icon: "📁", title: "Files and Editor", text: "Open Files from the bottom navigation. Selecting a file opens it in the Editor automatically. Use the three-dot menu for file actions and the Import button for files or a ZIP project." },
                    { icon: "▶️", title: "Run and Results", text: "Run actions appear only for supported source files or detected projects. HTML opens Preview. Code results show the current file, output, problems, files produced, and run details together." },
                    { icon: "📱", title: "Preview Sizes", text: "In Result & Preview, choose Mobile, Tablet, or Desktop. The selected frame is only a visual test size; it does not change your source files." },
                    { icon: "🖥️", title: "SK Shell", text: "SK Shell is the full project terminal. Use it for folders, Node.js, packages, build tools, commands, and live program input when a live workspace is available. Swipe output to scroll; the mobile key row provides terminal keys." },
                    { icon: "↔️", title: "More SK Shell Tabs", text: "Add another SK Shell when you need separate working folders or command history. Each full-shell tab keeps its own terminal state while working with the same workspace files." },
                    { icon: "💬", title: "SK-AI and AI Terminal", text: "The assistant receives a bounded active-file-first workspace context. It proposes scoped edits, commands, and previews first. Nothing is changed, run, deleted, or opened until you approve each proposal." },
                    { icon: "🕒", title: "Workspace retention", text: "Live workspaces can be kept for three days or scheduled for deletion in four hours. Browser source mirrors are separate and should be exported before clearing site data." },
                    { icon: "🐙", title: "GitHub", text: "Use a restricted fine-grained token for selected repositories. Codespaces permissions are only needed when you manage Codespaces." },
                  ].map((item) => (
                    <div key={item.title} style={{ display: "flex", gap: "0.75rem", padding: "0.6rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)", marginBottom: 2 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>{item.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">Privacy Policy</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    <p style={{ marginBottom: "0.6rem" }}>SK Coder keeps a browser source mirror for editing and export. Browser site-data clearing can remove that mirror, so export important projects as ZIP files.</p>
                    <p style={{ marginBottom: "0.6rem" }}>When you use a live workspace, GitHub, or an AI provider, only the selected files or messages needed for that requested action are sent to that service. Run details explain the available capability after each action.</p>
                    <p>Your API keys and GitHub tokens are stored by the browser for this application. Treat tokens as passwords, use an expiry, and give them the minimum permissions needed.</p>
                  </div>
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">Terms of Use</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    <p style={{ marginBottom: "0.6rem" }}>SK Coder is free to use. You may use it for personal and commercial projects. Do not use it to generate harmful content or violate the terms of any third-party service you connect.</p>
                    <p>The app is provided as-is. Saqlain King is not responsible for data loss, API costs, or issues arising from third-party services.</p>
                  </div>
                </div>

                <div className="settings-section" style={{ borderBottom: "none" }}>
                  <div className="settings-section-title">Contact & Links</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem", background: "var(--bg-elevated)", borderRadius: "var(--radius)", marginBottom: "0.75rem" }}>
                    <img src={developerPhoto} alt="Saqlain King" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--border-focus)" }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>Saqlain King</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Creator & Developer of SK Coder</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>Building tools for developers everywhere.</div>
                    </div>
                  </div>
                  <input ref={developerPhotoInputRef} type="file" accept="image/*" hidden onChange={(event) => changeDeveloperPhoto(event.target.files?.[0])} />
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "0.2rem 0.45rem", marginBottom: "0.75rem" }} onClick={requestDeveloperPhotoChange}>Change developer photo</button>
                  <div className="settings-hint" style={{ marginBottom: "0.75rem" }}>The photo change code is a local convenience gate. It does not provide account-level security.</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {[
                      { label: "Report a Bug", href: "mailto:support@skcoder.app", icon: "🐛" },
                      { label: "Request a Feature", href: "mailto:support@skcoder.app", icon: "💡" },
                    ].map((link) => (
                      <a key={link.label} href={link.href} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 12, color: "var(--accent)", textDecoration: "none", padding: "0.35rem 0" }}
                        target={link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                        <span>{link.icon}</span>
                        <span>{link.label}</span>
                      </a>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "0.9rem" }}>
                    <a href="/guide" target="_blank" rel="noopener noreferrer" className="settings-hint" style={{ color: "var(--accent)", textDecoration: "none" }}>User Guide</a>
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="settings-hint" style={{ color: "var(--accent)", textDecoration: "none" }}>Privacy</a>
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="settings-hint" style={{ color: "var(--accent)", textDecoration: "none" }}>Terms</a>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
