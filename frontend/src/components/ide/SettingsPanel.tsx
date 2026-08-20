import { useRef, useState } from "react";
import { useIDEStore } from "@/store/ideStore";
import { validateGitHubToken } from "@/lib/githubClient";
import { validateAPIKey } from "@/lib/aiClient";
import { toast } from "sonner";
import developerPortrait from "@/assets/saqlain-developer.jpg";
type ToggleProps = {
    checked: boolean;
    onChange: (v: boolean) => void;
};
function Toggle({ checked, onChange }: ToggleProps) {
    return (<label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}/>
      <span className="toggle-track"/>
    </label>);
}
type NavItem = {
    id: string;
    label: string;
    icon: React.ReactNode;
};
const NAV: NavItem[] = [
    {
        id: "editor", label: "Editor",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    },
    {
        id: "ai", label: "AI Assistant",
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
];
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
async function loadPuter(): Promise<typeof window.puter> {
    if (window.puter)
        return window.puter;
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://js.puter.com/v2/";
        s.onload = () => resolve(window.puter);
        s.onerror = () => reject(new Error("Failed to load Puter.js"));
        document.head.appendChild(s);
    });
}
export default function SettingsPanel() {
    const { settings, settingsTab, setSettingsTab, setShowSettings, updateEditorSettings, updateAISettings, updateGithubSettings, updatePreviewSettings, } = useIDEStore();
    const [keyInput, setKeyInput] = useState(settings.ai.apiKey);
    const [endpointInput, setEndpointInput] = useState(settings.ai.apiEndpoint);
    const [modelInput, setModelInput] = useState(settings.ai.model);
    const [tokenInput, setTokenInput] = useState(settings.github.token);
    const [showKey, setShowKey] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [checking, setChecking] = useState(false);
    const [puterConnecting, setPuterConnecting] = useState(false);
    const [puterConnected, setPuterConnected] = useState(() => {
        try {
            return !!window.puter?.auth?.isSignedIn();
        }
        catch {
            return false;
        }
    });
    const [developerPhoto, setDeveloperPhoto] = useState(() => localStorage.getItem("sk-coder-developer-photo") || developerPortrait);
    const developerPhotoInputRef = useRef<HTMLInputElement>(null);
    async function handleConnectKey() {
        if (!keyInput.trim()) {
            toast.error("Paste your API key first");
            return;
        }
        setChecking(true);
        try {
            const endpoint = endpointInput.trim();
            const model = modelInput.trim();
            const status = await validateAPIKey(keyInput.trim(), endpoint, model);
            if (status === "valid") {
                updateAISettings({ apiKey: keyInput.trim(), apiEndpoint: endpoint, model, keyStatus: "valid", usePuter: false });
                toast.success("AI Assistant connected!");
            }
            else if (status === "expired") {
                updateAISettings({ apiKey: keyInput.trim(), keyStatus: "expired" });
                toast.error("Key has no remaining credits");
            }
            else if (status === "unsupported") {
                updateAISettings({ keyStatus: status });
                toast.error("This provider is not configured. Add its compatible endpoint and model, or choose a supported provider.");
            }
            else if (status === "unreachable") {
                updateAISettings({ keyStatus: status });
                toast.error("The AI service could not be reached. Check the endpoint, browser network access, or provider CORS policy.");
            }
            else if (status === "configuration_error") {
                updateAISettings({ keyStatus: status });
                toast.error("The key was accepted but the model or endpoint configuration needs attention.");
            }
            else {
                updateAISettings({ keyStatus: "invalid" });
                toast.error("Invalid API key — try again");
            }
        }
        finally {
            setChecking(false);
        }
    }
    async function handleConnectPuter() {
        setPuterConnecting(true);
        try {
            const puter = await loadPuter();
            if (!puter) {
                toast.error("Failed to load Puter.js");
                return;
            }
            if (!puter.auth.isSignedIn()) {
                await puter.auth.signIn();
            }
            if (puter.auth.isSignedIn()) {
                setPuterConnected(true);
                updateAISettings({ usePuter: true });
                toast.success("Free AI Assistant connected!");
            }
        }
        catch {
            toast.error("Puter sign-in was cancelled or failed");
        }
        finally {
            setPuterConnecting(false);
        }
    }
    async function handleValidateToken() {
        if (!tokenInput.trim()) {
            toast.error("Paste your GitHub token first");
            return;
        }
        const { valid, username } = await validateGitHubToken(tokenInput.trim());
        if (valid) {
            updateGithubSettings({ token: tokenInput.trim(), username });
            toast.success(`Connected as @${username}`);
        }
        else {
            toast.error("Invalid GitHub token");
        }
    }
    function handleClearApiKey() {
        setKeyInput("");
        updateAISettings({ apiKey: "", keyStatus: "none" });
        toast.success("Your API key was removed from this browser");
    }
    function handleDisconnectGitHub() {
        setTokenInput("");
        updateGithubSettings({ token: "", username: "", codespaceActive: "" });
        toast.success("GitHub was disconnected from this browser");
    }
    function requestDeveloperPhotoChange() {
        if (window.prompt("Enter the local edit code") !== "0") {
            toast.error("Edit code did not match");
            return;
        }
        developerPhotoInputRef.current?.click();
    }
    function changeDeveloperPhoto(file: File | undefined) {
        if (!file?.type.startsWith("image/")) {
            toast.error("Choose an image file");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const value = typeof reader.result === "string" ? reader.result : "";
            if (!value)
                return;
            try {
                localStorage.setItem("sk-coder-developer-photo", value);
                setDeveloperPhoto(value);
                toast.success("Developer photo updated in this browser");
            }
            catch {
                toast.error("This image is too large to save in this browser");
            }
        };
        reader.readAsDataURL(file);
    }
    const keyStatus = settings.ai.keyStatus;
    return (<div className="settings-overlay" onClick={() => setShowSettings(false)}>
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
            {NAV.map((item) => (<div key={item.id} className={`settings-nav-item ${settingsTab === item.id ? "active" : ""}`} onClick={() => setSettingsTab(item.id)}>
                {item.icon}
                <span>{item.label}</span>
              </div>))}
          </nav>

          <div className="settings-content">

            {settingsTab === "editor" && (<>
                <div className="settings-section">
                  <div className="settings-section-title">Appearance</div>
                  <div className="settings-row">
                    <label>Font Size</label>
                    <input type="number" min={10} max={24} style={{ maxWidth: 70 }} value={settings.editor.fontSize} onChange={(e) => updateEditorSettings({ fontSize: Number(e.target.value) })}/>
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
                  <div className="settings-row"><label>Word Wrap</label><Toggle checked={settings.editor.wordWrap === "on"} onChange={(v) => updateEditorSettings({ wordWrap: v ? "on" : "off" })}/></div>
                  <div className="settings-row"><label>Minimap</label><Toggle checked={settings.editor.minimap} onChange={(v) => updateEditorSettings({ minimap: v })}/></div>
                  <div className="settings-row"><label>Line Numbers</label><Toggle checked={settings.editor.lineNumbers === "on"} onChange={(v) => updateEditorSettings({ lineNumbers: v ? "on" : "off" })}/></div>
                  <div className="settings-row"><label>Auto Save</label><Toggle checked={settings.editor.autoSave} onChange={(v) => updateEditorSettings({ autoSave: v })}/></div>
                  <div className="settings-row"><label>Bracket Colors</label><Toggle checked={settings.editor.bracketPairs} onChange={(v) => updateEditorSettings({ bracketPairs: v })}/></div>
                  <div className="settings-row"><label>Smooth Scroll</label><Toggle checked={settings.editor.smoothScrolling} onChange={(v) => updateEditorSettings({ smoothScrolling: v })}/></div>
                </div>
              </>)}

            {settingsTab === "ai" && (<>
                <div className="settings-section">
                  <div className="settings-section-title">Free AI Assistant</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                    Connect the free option if it is available. You can also use your own AI key below.
                  </div>
                  {puterConnected || settings.ai.usePuter ? (<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.75rem", background: "rgba(40, 167, 69, 0.12)", border: "1px solid rgba(40, 167, 69, 0.3)", borderRadius: "var(--radius)", marginBottom: "0.5rem" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>Free AI Assistant is connected</span>
                      <button className="btn btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "0.15rem 0.5rem" }} onClick={() => { setPuterConnected(false); updateAISettings({ usePuter: false }); }}>
                        Disconnect
                      </button>
                    </div>) : (<button className="btn btn-primary" onClick={handleConnectPuter} disabled={puterConnecting} style={{ width: "100%", justifyContent: "center", marginBottom: "0.5rem" }}>
                      {puterConnecting ? "Connecting..." : "Connect Free AI Assistant"}
                    </button>)}
                  <div className="settings-hint">The free option needs an internet connection. You can disconnect it at any time.</div>
                </div>

                <div className="settings-section">
                  <div className="settings-section-title">Connect Your AI Provider</div>
                  <div className="settings-hint" style={{ marginBottom: "0.7rem" }}>For a supported provider, paste the key and select Connect. Leave the two fields below empty unless the provider gives you a documented OpenAI-compatible Base URL and Model.</div>
                  <div className="settings-row col">
                    <label>API Key</label>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", width: "100%" }}>
                      <input type={showKey ? "text" : "password"} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Paste your API key here..." style={{ fontFamily: "var(--font-code)", fontSize: 11, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && handleConnectKey()}/>
                      <button className="btn btn-ghost" style={{ padding: "0.25rem 0.5rem", flexShrink: 0 }} onClick={() => setShowKey(!showKey)}>
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div className="settings-row col" style={{ marginTop: "0.7rem" }}>
                    <label>Compatible Base URL, only if your provider gives one</label>
                    <input value={endpointInput} onChange={(e) => setEndpointInput(e.target.value)} placeholder="Optional. Example: https://provider.example/v1" style={{ fontFamily: "var(--font-code)", fontSize: 11 }}/>
                  </div>
                  <div className="settings-row col" style={{ marginTop: "0.7rem" }}>
                    <label>Model, only if your provider gives one</label>
                    <input value={modelInput} onChange={(e) => setModelInput(e.target.value)} placeholder="Optional. Example: provider-model-name" style={{ fontFamily: "var(--font-code)", fontSize: 11 }}/>
                  </div>
                  <div className="settings-hint" style={{ marginTop: "0.5rem" }}>Do not enter the provider website address. Use these fields only when its API documentation gives an OpenAI-compatible chat endpoint and exact model name. Other API formats need their own tested provider adapter.</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem" }}>
                    {keyStatus === "valid" && <span style={{ fontSize: 12, color: "var(--green)" }}>✓ Connected</span>}
                    {keyStatus === "invalid" && <span style={{ fontSize: 12, color: "var(--red)" }}>✗ Invalid key</span>}
                    {keyStatus === "expired" && <span style={{ fontSize: 12, color: "var(--orange)" }}>⚠ Credits used up</span>}
                    {keyStatus === "unsupported" && <span style={{ fontSize: 12, color: "var(--orange)" }}>Provider needs endpoint setup</span>}
                    {keyStatus === "unreachable" && <span style={{ fontSize: 12, color: "var(--orange)" }}>Service could not be reached</span>}
                    {keyStatus === "configuration_error" && <span style={{ fontSize: 12, color: "var(--orange)" }}>Endpoint or model needs setup</span>}
                    {(keyStatus === "none" || keyStatus === "checking") && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{checking ? "Checking..." : "Not connected"}</span>}
                    <button className="btn btn-primary" onClick={handleConnectKey} disabled={checking || !keyInput.trim()}>
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
                    <Toggle checked={settings.ai.autoContext} onChange={(v) => updateAISettings({ autoContext: v })}/>
                  </div>
                  <div className="settings-hint">When this is on, the open file is shared with the assistant so it can help with that code.</div>
                </div>
              </>)}

            {settingsTab === "github" && (<>
                <div className="settings-section">
                  <div className="settings-section-title">Personal Access Token</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                    Use a fine-grained token when possible. Limit it to selected repositories and grant Contents read or write only as needed. Add Codespaces read or write only when you manage Codespaces.
                  </div>
                  {settings.github.username && (<div className="settings-key-status valid" style={{ marginBottom: "0.75rem" }}>
                      ✓ Connected as @{settings.github.username}
                    </div>)}
                  <div className="settings-row col">
                    <label>GitHub Token</label>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", width: "100%" }}>
                      <input type={showToken ? "text" : "password"} value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="github_pat_... or ghp_..." style={{ fontFamily: "var(--font-code)", fontSize: 11, flex: 1 }}/>
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
              </>)}

            {settingsTab === "preview" && (<>
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
                    <Toggle checked={settings.preview.autoRefresh} onChange={(v) => updatePreviewSettings({ autoRefresh: v })}/>
                  </div>
                </div>
              </>)}

            {settingsTab === "about" && (<>
                <div className="settings-section">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background: "rgba(137, 180, 250, 0.16)", color: "var(--accent)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="3"/>
                        <path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>
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
                  <div className="settings-section-title">Help and policies</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "0.75rem" }}>Read the full guide, privacy policy, terms, and limits on their own simple page.</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                    <a className="btn btn-primary" href="/guide" style={{ fontSize: 11, padding: "0.38rem 0.55rem", textDecoration: "none" }}>Open User Guide</a>
                    <a className="btn btn-ghost" href="/privacy" style={{ fontSize: 11, padding: "0.38rem 0.55rem", textDecoration: "none" }}>Privacy</a>
                    <a className="btn btn-ghost" href="/terms" style={{ fontSize: 11, padding: "0.38rem 0.55rem", textDecoration: "none" }}>Terms</a>
                  </div>
                </div>

                <div className="settings-section" style={{ borderBottom: "none" }}>
                  <div className="settings-section-title">Contact & Links</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem", background: "var(--bg-elevated)", borderRadius: "var(--radius)", marginBottom: "0.75rem" }}>
                    <img src={developerPhoto} alt="Saqlain King" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--border-focus)" }}/>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>Saqlain King</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Creator & Developer of SK Coder</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>Building tools for developers everywhere.</div>
                    </div>
                  </div>
                  <input ref={developerPhotoInputRef} type="file" accept="image/*" hidden onChange={(event) => changeDeveloperPhoto(event.target.files?.[0])}/>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "0.2rem 0.45rem", marginBottom: "0.75rem" }} onClick={requestDeveloperPhotoChange}>Change developer photo</button>
                  <div className="settings-hint" style={{ marginBottom: "0.75rem" }}>The photo change code is a local convenience gate. It does not provide account-level security.</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {[
                { label: "Report a Bug", href: "mailto:support@skcoder.app", icon: "🐛" },
                { label: "Request a Feature", href: "mailto:support@skcoder.app", icon: "💡" },
            ].map((link) => (<a key={link.label} href={link.href} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 12, color: "var(--accent)", textDecoration: "none", padding: "0.35rem 0" }} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                        <span>{link.icon}</span>
                        <span>{link.label}</span>
                      </a>))}
                  </div>
                </div>
              </>)}

          </div>
        </div>
      </div>
    </div>);
}
