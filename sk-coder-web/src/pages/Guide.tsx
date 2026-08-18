import { useLocation } from "wouter"

export default function GuidePage() {
  const [, navigate] = useLocation()

  return (
    <div className="page-layout">
      <div className="page-content">
        <button className="page-back" onClick={() => navigate("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to SK Coder
        </button>

        <h1>SK Coder Guide</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          Everything you need to know about using SK Coder — built by Saqlain King.
        </p>

        <h2>Getting Started</h2>
        <p>SK Coder is a full-featured web workspace that works on any device — phone, tablet, or desktop. No installation needed.</p>
        <ul>
          <li>Open a file from the Explorer to start editing</li>
          <li>Use the bottom navigation bar on mobile to switch between sections</li>
          <li>Press the Run button (▶) in the top bar to run the current file</li>
          <li>Export your project as a ZIP at any time</li>
        </ul>

        <h2>File Explorer</h2>
        <ul>
          <li>Click a file to open it in the editor</li>
          <li>Right-click any file or folder for rename, delete, and new file options</li>
          <li>Drag and drop files to move them between folders</li>
          <li>Import ZIP archives or individual files using the toolbar buttons</li>
          <li>Flat file imports go directly to the project root — no extra folder created</li>
        </ul>

        <h2>Running Code</h2>

        <h3>Result & Preview</h3>
        <p>Press Run for the current file. HTML opens in Preview. Other supported source files open Console automatically, with Problems, Files Produced, and Runtime available from the same result area.</p>

        <h3>Source files</h3>
        <p>Python, Node.js, Java, C, C++, Rust, Go, PHP, Ruby, Kotlin, and other supported source files use the available execution service. Runtime always identifies the source of the result. A source fallback can run one file, but it cannot install packages or replace a project workspace.</p>

        <h3>Terminals</h3>
        <p>SK Shell is the full project terminal for commands, folders, packages, and build tools. Python Run, Node Run, and Java Run are source-run tabs for quick snippets. Add another SK Shell when you need a separate current directory or command history.</p>

        <h3>HTML / CSS Preview</h3>
        <p>Running an HTML file automatically opens the Preview tab. Linked CSS and JS are inlined so the preview works without a server.</p>

        <h2>AI Assistant</h2>
        <p>SK-AI can explain code and propose workspace changes. It never writes files, runs commands, or opens previews automatically: you review and approve each proposed action.</p>

        <div className="step-box">
          <div className="step-num">1</div>
          <div>Get an API key from your AI provider's website (Account → API Keys section)</div>
        </div>
        <div className="step-box">
          <div className="step-num">2</div>
          <div>Open <strong>Settings → AI</strong> and paste your key</div>
        </div>
        <div className="step-box">
          <div className="step-num">3</div>
          <div>Choose a supported provider and model, then validate the connection</div>
        </div>
        <div className="step-box">
          <div className="step-num">4</div>
          <div>Open the AI tab and start chatting. Review every proposed write, command, or preview action before approving it.</div>
        </div>

        <h2>GitHub & Codespaces (SK Git)</h2>
        <p>SK Git lets you open and manage GitHub Codespaces from inside SK Coder. You need a Personal Access Token (PAT).</p>

        <h3>Creating a GitHub PAT</h3>
        <div className="step-box">
          <div className="step-num">1</div>
          <div>GitHub.com → profile picture → <strong>Settings</strong></div>
        </div>
        <div className="step-box">
          <div className="step-num">2</div>
          <div>Scroll left sidebar to bottom → <strong>Developer settings</strong></div>
        </div>
        <div className="step-box">
          <div className="step-num">3</div>
          <div><strong>Personal access tokens</strong> → <strong>Tokens (classic)</strong> → <strong>Generate new token (classic)</strong></div>
        </div>
        <div className="step-box">
          <div className="step-num">4</div>
          <div>Name it <em>"SK Coder"</em>, set expiration, then check the <strong>codespace</strong> and <strong>repo</strong> scopes</div>
        </div>
        <div className="step-box">
          <div className="step-num">5</div>
          <div>Click <strong>Generate token</strong> and copy it (starts with <code style={{ color: "var(--orange)" }}>ghp_</code>)</div>
        </div>
        <div className="step-box">
          <div className="step-num">6</div>
          <div>In SK Coder: <strong>Settings → GitHub</strong> → paste token → <strong>Connect GitHub</strong></div>
        </div>

        <h2>Exporting Projects</h2>
        <p>Click the download icon in the top bar to export your entire project as a ZIP. You can re-import it into SK Coder at any time.</p>

        <h2>Building the Native Android App</h2>

        <h3>Prerequisites</h3>
        <ul>
          <li>Node.js 18+ (<a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>)</li>
          <li>Free Expo account (<a href="https://expo.dev" target="_blank" rel="noopener noreferrer">expo.dev</a>)</li>
        </ul>

        <div className="step-box">
          <div className="step-num">1</div>
          <div>Download the native app source ZIP and extract it</div>
        </div>
        <div className="step-box">
          <div className="step-num">2</div>
          <div>Open a terminal in the folder and run: <div className="code-block">npm install</div></div>
        </div>
        <div className="step-box">
          <div className="step-num">3</div>
          <div>Install EAS CLI: <div className="code-block">npm install -g eas-cli</div></div>
        </div>
        <div className="step-box">
          <div className="step-num">4</div>
          <div>Log in: <div className="code-block">eas login</div></div>
        </div>
        <div className="step-box">
          <div className="step-num">5</div>
          <div>Build APK: <div className="code-block">eas build --platform android --profile preview</div></div>
        </div>
        <div className="step-box">
          <div className="step-num">6</div>
          <div>Wait 5–10 minutes. Download the APK from the link shown or from expo.dev → Builds</div>
        </div>
        <div className="step-box">
          <div className="step-num">7</div>
          <div>Transfer to your Android phone and install. Enable "Install from unknown sources" if prompted.</div>
        </div>

        <div style={{ marginTop: "2rem", padding: "1rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>Need more help?</p>
          <p>The AI assistant can answer questions about any of these topics. Open the AI tab and ask.</p>
        </div>
      </div>
    </div>
  )
}
