import { useLocation } from "wouter"

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return <div className="step-box"><div className="step-num">{number}</div><div>{children}</div></div>
}

export default function GuidePage() {
  const [, navigate] = useLocation()

  return (
    <div className="page-layout">
      <div className="page-content">
        <button className="page-back" onClick={() => navigate("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to SK Coder
        </button>

        <h1>SK Coder Guide</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>A mobile-first workspace for editing source code, running supported files, and working with Oracle-backed projects when a workspace runtime is available.</p>

        <h2>Files, Explorer, and Editor</h2>
        <p>Use <strong>Files</strong> to browse, import, create, rename, move, download, and open project files. Files first opens the Explorer as its own workspace view. Select Files again to dock Explorer beside Editor, and select Files once more to hide the dock and return to a full-width Editor.</p>
        <p>Opening a file always moves to Editor. The file menu only shows <strong>Run File</strong>, <strong>Preview Static Site</strong>, <strong>Build Project</strong>, or <strong>Run Project</strong> when the selected extension or folder manifest has a supported action.</p>

        <h2>Run, Build, Preview, and Results</h2>
        <p>The top Run button and the file menu run the active source file. HTML files use a browser static preview with linked local CSS and JavaScript. Source results open in Console, with Problems, Files Produced, and Runtime available in the same Result &amp; Preview area.</p>
        <p>For programs that read numbers or text, open Console and use <strong>Input before run</strong>. Enter one value per line, then choose <strong>Run with input</strong>. This supplies standard input before the source program begins. It is useful for simple C++, Java, Python, and similar console programs.</p>

        <div className="step-box"><div className="step-num">!</div><div>Input before run is not a live terminal. If a program asks a question after it has started, use SK Shell with an available Oracle Workspace, type the answer into the terminal prompt, and press Send.</div></div>

        <h2>Runtime locations</h2>
        <table>
          <thead><tr><th>Runtime label</th><th>What it can do</th><th>What it cannot do</th></tr></thead>
          <tbody>
            <tr><td>Oracle Workspace</td><td>Full folders, packages, SK Shell commands, builds, tests, supported project tools, and installed runtimes.</td><td>It is unavailable until the Oracle Docker runtime is deployed and online.</td></tr>
            <tr><td>Browser Static Preview</td><td>Static local HTML, CSS, JavaScript, images, and linked browser assets.</td><td>It does not run servers, package managers, backend code, or native programs.</td></tr>
            <tr><td>Wandbox Source Fallback</td><td>A small supported single source file, with optional input supplied before launch.</td><td>No folders, packages, project files, terminal, live prompts, or persistence.</td></tr>
            <tr><td>Pyodide Python Fallback</td><td>Compatible small Python source in the browser.</td><td>No system terminal, server, sockets, threads, full virtual environment, or project guarantee.</td></tr>
            <tr><td>Unavailable</td><td>Your source remains in browser storage and can be exported.</td><td>No fake output is shown for an unavailable project runtime.</td></tr>
          </tbody>
        </table>

        <h2>Installed Oracle runtimes</h2>
        <p>When Oracle Workspace is online, SK Shell supports the installed project families below. Source-only fallback availability depends on the live public compiler catalog and is always shown in Runtime after a run.</p>
        <table>
          <thead><tr><th>Family</th><th>Installed tools</th><th>Typical project files</th></tr></thead>
          <tbody>
            <tr><td>Web and Node</td><td>Node.js, TypeScript, npm, pnpm, yarn</td><td>JavaScript, TypeScript, Vite, React, Next.js, NestJS, package.json</td></tr>
            <tr><td>Python</td><td>Python 3, pip, NumPy</td><td>Python scripts, requirements.txt, pyproject.toml</td></tr>
            <tr><td>JVM</td><td>Java, Kotlin</td><td>Java, Kotlin, Maven, Gradle projects</td></tr>
            <tr><td>Native and systems</td><td>GCC, G++, Rust, Cargo, Go</td><td>C, C++, CMake, Make, Rust, Go</td></tr>
            <tr><td>Server-side scripting</td><td>PHP, Ruby, Bash</td><td>PHP, Composer projects, Ruby, Gemfile, shell scripts</td></tr>
          </tbody>
        </table>
        <p>SK Coder does not claim to run every language in existence. Runtimes such as .NET, Swift, Dart, Android Gradle builds, GPU workloads, desktop GUI toolkits, and engine-specific game stacks require an explicitly installed and tested Oracle image before they can be offered as supported actions.</p>

        <h2>Projects and games</h2>
        <p>A static web game made with HTML, CSS, JavaScript, images, audio, and browser APIs can be opened through Preview when its HTML entry file is selected. A Vite, React, Next.js, NestJS, Java, Rust, Go, PHP, Ruby, Python, or multi-file project requires Oracle Workspace and SK Shell to install dependencies, build, test, and run commands.</p>
        <p>A Java console game can run in SK Shell and accept live input when Oracle Workspace is online. A Java desktop GUI game does not automatically appear in the browser preview, because a browser IDE cannot display arbitrary native desktop windows. A browser-compatible game needs a browser target; a native game needs a configured runtime and an appropriate display or export path.</p>

        <h2>SK Shell and AI Terminal</h2>
        <p><strong>SK Shell</strong> is the only full terminal. It is for <code>cd</code>, Node.js, npm, pnpm, package installs, Git, compiler commands, build tools, and interactive programs. Add another SK Shell when you need a separate current directory or command history. Shell tabs share the same Oracle workspace files but maintain separate shell processes and working directories.</p>
        <p>On phones, swipe the terminal output to scroll. The key row above the input provides Tab, arrow keys, Escape, and Ctrl+C. Use Send to submit a command or type a live response to a program that is waiting for input. These controls work against a live Oracle shell; when the workspace service is offline, SK Coder shows that status rather than simulating a terminal.</p>
        <p><strong>AI Terminal</strong> is a workspace-aware assistant surface, not a shell. It receives a bounded active-file-first project excerpt and file path map. It can explain code and propose file writes, folders, deletions, commands, and previews. Each proposal shows its scope or content preview and needs its own Allow or Decline decision before anything changes.</p>

        <h2>Workspace retention and browser storage</h2>
        <p>When an Oracle workspace is created, choose <strong>Keep 3 days</strong> to retain it for the three-day workspace period, or choose <strong>Delete in 4 hours</strong> when you are finished. Scheduled deletion can be cancelled during its undo window. Refreshing a page does not by itself delete the workspace.</p>
        <p>Your browser keeps a local source mirror for continuity and ZIP export. This mirror is not a cloud workspace, does not include dependency or build caches, and can be removed if you clear browser site data. Export important work as a ZIP before clearing site data or relying on automatic deletion.</p>

        <h2>SK-AI setup</h2>
        <Step number={1}>Open <strong>Settings → AI</strong>.</Step>
        <Step number={2}>Choose Free Puter AI, or select a supported provider and enter your own provider API key.</Step>
        <Step number={3}>Validate the selected provider, then open AI or AI Terminal.</Step>
        <Step number={4}>Ask for an explanation, plan, fix, file creation, build command, or preview. Review each proposed action before allowing it.</Step>
        <p>An AI provider key is not a GitHub Copilot or Codespaces key. GitHub Copilot availability depends on the user’s GitHub plan and is separate from custom AI-provider access.</p>

        <h2>GitHub and Codespaces</h2>
        <p>SK Git connects to GitHub through a personal access token. Use a <strong>fine-grained token</strong> when possible, restrict it to the repositories you choose, set an expiry, and grant only the actions you plan to use.</p>
        <Step number={1}>On GitHub, open <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens</strong>.</Step>
        <Step number={2}>Choose the correct resource owner and only the repositories you want to connect.</Step>
        <Step number={3}>Grant <strong>Contents: Read</strong> for browsing, or <strong>Contents: Write</strong> only if you need to push changes. Grant <strong>Codespaces: Read/Write</strong> only if you need to list, create, start, or stop Codespaces.</Step>
        <Step number={4}>Copy the token once, then paste it into <strong>Settings → GitHub</strong>. Do not put a token in a source file, chat message, or public repository.</Step>
        <p>Some organizations require token approval or SSO authorization. A Codespace normally has access to its source repository; access to other repositories requires the repository owner’s permissions and review during Codespace creation.</p>

        <h2>APK and ZIP editor</h2>
        <p>The APK section is a file editor and repackaging tool for APK or ZIP archives. It can browse and edit supported extracted text files, then save a changed archive for download. It is not equivalent to APK Editor Pro, Android Studio, a full Android decompiler, a signing service, or an Android build farm. Native Android builds need an Android project, supported build tooling, signing credentials, and a configured build environment.</p>

        <h2>Exporting and safe deletion</h2>
        <p>Use the download control to export the project as a ZIP at any time. File deletion removes the selected local workspace item; export a ZIP before deleting important work. Workspace retention controls apply to the Oracle workspace, not to a manual browser-data clear.</p>

        <div style={{ marginTop: "2rem", padding: "1rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>Need help with a project?</p>
          <p>Open AI or AI Terminal, select the relevant file, and ask for a plan before approving any workspace action.</p>
        </div>
      </div>
    </div>
  )
}
