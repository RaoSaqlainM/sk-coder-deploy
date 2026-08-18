import { useLocation } from "wouter"
import PublicFooter from "@/components/PublicFooter"

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

        <h1>SK Coder Help</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Learn how to edit files, run supported code, preview web projects, use the terminal, and work with SK Coder AI.</p>

        <h2>Files and Editor</h2>
        <p>Use <strong>Files</strong> to import, create, rename, move, download, and open projects. Opening a file moves you to Editor. The three-dot file menu shows only actions that make sense for the selected file or folder.</p>
        <p>The top action always uses the file currently open in Editor. It does not run an earlier file in the background. After a run, the Result Center shows the file name, status, output, problems, files produced, and run details together.</p>

        <h2>Selecting, moving, and exporting files</h2>
        <p>Choose the <strong>Select</strong> button in Files to enter selection mode. On a desktop, hold Ctrl or Command while choosing files or folders. On a phone, press and hold a file or folder to begin selection mode.</p>
        <Step number={1}>Select one or more files or folders. A toolbar shows the current count.</Step>
        <Step number={2}>Choose <strong>Copy</strong> or <strong>Move</strong>, then choose the destination folder from the Explorer. This avoids accidental moves on touch screens.</Step>
        <Step number={3}>Choose <strong>Download</strong> to create a ZIP of the selected items, or <strong>Delete</strong> to remove them after confirmation.</Step>
        <p>Use <strong>Done</strong> to leave selection mode. Selection mode does not open or change a file until you choose a batch action.</p>

        <h2>Run, Preview, and Results</h2>
        <table>
          <thead><tr><th>What you open</th><th>What SK Coder gives you</th></tr></thead>
          <tbody>
            <tr><td>HTML, CSS, JavaScript, images, and browser assets</td><td>Preview with Mobile, Tablet, Desktop, full-browser, and reload controls.</td></tr>
            <tr><td>Supported console code</td><td>Output, errors, exit status, Program input, and Interactive terminal when available.</td></tr>
            <tr><td>Project folder</td><td>Open in Terminal or open with your connected GitHub workspace.</td></tr>
            <tr><td>Generated files</td><td>Files Produced, with view or download options when the file type allows it.</td></tr>
            <tr><td>Unsupported desktop graphical app</td><td>Clear build or error information and a download/external-environment path instead of a fake preview.</td></tr>
          </tbody>
        </table>

        <h2>Program input and interactive programs</h2>
        <p>Use <strong>Program input</strong> when a console program reads prepared values, such as a calculator that asks for an option and two numbers. Add one value per line, then choose <strong>Run with these values</strong>.</p>
        <Step number={1}>Open a supported console file and choose <strong>Run</strong>.</Step>
        <Step number={2}>In Console, select <strong>Program input</strong>.</Step>
        <Step number={3}>Enter values in the same order the program reads them, one value per line.</Step>
        <Step number={4}>Choose <strong>Run with these values</strong> and inspect Output or Problems.</Step>
        <div className="step-box"><div className="step-num">!</div><div>If the program asks questions while it is already running, choose <strong>Open interactive terminal</strong>. Use that terminal to answer prompts one at a time and use Ctrl+C to stop a program.</div></div>

        <h2>Projects, websites, and games</h2>
        <p>Browser-compatible websites and games work in Preview when their local files are included in the project. A static site can use linked stylesheets, scripts, images, audio, video, JSON data, and browser APIs.</p>
        <p>Projects that need packages, build tools, tests, servers, databases, or multiple source files should be opened in SK Shell. Once a supported project server is running, SK Coder can provide a project preview when one is available.</p>
        <p>Text-based Java, C++, Python, Kotlin, Go, Rust, Node.js, PHP, Ruby, and Bash programs can use Console or Interactive terminal. Desktop windows such as Java Swing, JavaFX, AWT, or native GUI applications are not browser previews. SK Coder can show their build result and generated files, but a real desktop environment is needed to display the window.</p>

        <h2>Supported workspaces</h2>
        <table>
          <thead><tr><th>Language or file type</th><th>Run or preview path</th><th>Important limit</th></tr></thead>
          <tbody>
            <tr><td>HTML, CSS, JavaScript browser projects</td><td>Preview static sites and browser games with local assets.</td><td>Server routes, package installs, and build tooling need SK Shell.</td></tr>
            <tr><td>JavaScript and Node.js: .js, .mjs, .cjs, .jsx</td><td>Run a single source file. Use SK Shell for npm, pnpm, Yarn, Vite, React, Next.js, NestJS, and multi-file projects.</td><td>Public source runs are not a package shell or long-running web server.</td></tr>
            <tr><td>TypeScript: .ts, .tsx</td><td>Run supported single source files. Use SK Shell for tsconfig, package dependencies, frameworks, and builds.</td><td>Framework projects need a live workspace.</td></tr>
            <tr><td>Python and NumPy: .py</td><td>Run supported single source files with Program input. Use SK Shell for virtual environments, pip, requirements files, and projects.</td><td>Browser fallback is source-only and cannot promise arbitrary packages.</td></tr>
            <tr><td>Java: .java, JAR projects</td><td>Run console source files. Use SK Shell for Maven, Gradle, multiple classes, JAR packaging, and interactive programs.</td><td>Console games can run; Swing, AWT, and JavaFX windows are not browser previews.</td></tr>
            <tr><td>Kotlin: .kt</td><td>Use SK Shell for compile and project commands.</td><td>No public single-file fallback is promised.</td></tr>
            <tr><td>C and C++: .c, .cpp, .cc, .h</td><td>Run supported console source files with Program input. Use SK Shell for CMake, Make, headers, libraries, and projects.</td><td>Native desktop windows need a separate desktop environment.</td></tr>
            <tr><td>Rust: .rs</td><td>Run supported source files. Use SK Shell for Cargo crates, dependencies, tests, and workspaces.</td><td>Package and multi-crate work requires a live workspace.</td></tr>
            <tr><td>Go: .go</td><td>Run supported source files. Use SK Shell for modules, tests, and services.</td><td>Module downloads and servers require a live workspace.</td></tr>
            <tr><td>PHP: .php and Ruby: .rb</td><td>Run supported source files. Use SK Shell for Composer, Bundler, frameworks, and server projects.</td><td>Web frameworks need a live workspace and preview process.</td></tr>
            <tr><td>Bash and shell: .sh</td><td>Use SK Shell for commands and scripts.</td><td>Shell access depends on a live workspace connection.</td></tr>
            <tr><td>JSON, XML, YAML, TOML, Markdown, SQL, text, config files</td><td>Edit, search, export, and use as project input.</td><td>They do not have a standalone run action.</td></tr>
            <tr><td>Other languages and binary formats</td><td>SK Coder can keep and edit text files when possible.</td><td>If a language is not listed above, direct execution is not promised. Use a suitable live environment or external tool.</td></tr>
          </tbody>
        </table>
        <p>SK Coder can edit any text file. A run action appears only when a supported runtime and workflow are available. It does not claim to run every programming language, game engine, desktop toolkit, mobile build, hardware tool, or specialist package in a browser.</p>

        <h2>Archives and extracted folders</h2>
        <p>When you import a ZIP-compatible archive, SK Coder extracts it into a new folder with the same name as the archive. Supported browser extraction formats are <strong>.zip, .jar, .apk, .xapk, .apks, .war, .ear, and .aar</strong>. These formats share ZIP container structure.</p>
        <p>Protected, multi-volume, damaged, unusually large, or very large-entry archives can fail safely. Formats such as <strong>.rar, .7z, .tar, .gz, .bz2, and .xz</strong> are not extracted in the browser. Keep the original archive or use a live workspace or external archive utility for those formats.</p>

        <h2>SK Shell and AI Terminal</h2>
        <p><strong>SK Shell</strong> is the full terminal. Use it for folders, <code>cd</code>, Git, Node.js, package installs, compiler commands, build tools, and live text programs. Each SK Shell tab keeps its own current folder, command history, and transcript.</p>
        <p>On a phone, swipe terminal output to scroll. The key row above the input provides Tab, arrow keys, Escape, and Ctrl+C. The terminal shows an honest unavailable message when a live workspace is not ready; it never invents command output.</p>
        <p><strong>AI Terminal</strong> is an assistant surface, not a shell. It can explain the active workspace and propose scoped edits, folders, commands, or previews. It always asks for approval before changing, running, deleting, or opening anything.</p>

        <h2>SK Coder AI setup</h2>
        <Step number={1}>Open <strong>Settings → AI</strong>.</Step>
        <Step number={2}>Choose the free compatible option when available, or enter your own compatible provider key.</Step>
        <Step number={3}>Validate the selected provider, then open AI or AI Terminal.</Step>
        <Step number={4}>Ask for an explanation, plan, fix, file creation, build command, or preview. Review every proposed action before approving it.</Step>
        <p>SK Coder AI receives the active-file-first workspace context needed for your request. It does not need or expose the application’s private implementation details.</p>

        <h2>Workspace retention and browser storage</h2>
        <p>When a live workspace is created, choose <strong>Keep 3 days</strong> to retain it for the workspace period, or choose <strong>Delete in 4 hours</strong> when you are finished. Scheduled deletion can be cancelled during its undo window. Refreshing the page does not delete the workspace by itself.</p>
        <p>Your browser keeps a local source mirror for continuity and ZIP export. Export important work as a ZIP before clearing browser site data or relying on automatic deletion.</p>

        <h2>GitHub and Codespaces</h2>
        <p>SK Git connects to GitHub through a personal access token. Use a <strong>fine-grained token</strong> when possible, restrict it to the repositories you choose, set an expiry, and grant only the actions you need.</p>
        <Step number={1}>On GitHub, open <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens</strong>.</Step>
        <Step number={2}>Choose the correct owner and only the repositories you want to connect.</Step>
        <Step number={3}>Grant <strong>Contents: Read</strong> for browsing, or <strong>Contents: Write</strong> only when you need to push changes.</Step>
        <Step number={4}>Paste the token into <strong>Settings → GitHub</strong>. Never put a token in a source file, chat message, or public repository.</Step>
        <p>In <strong>GitHub → Repositories</strong>, choose <strong>Import to Explorer</strong> to add a selected repository as a new folder without replacing your existing files. SK Coder imports supported text files within safe size limits; use Codespaces for large repositories, binaries, or full development environments.</p>
        <p>Use <strong>Push Files</strong> to choose a repository, enter a commit message, and explicitly commit the current Explorer files. Repository creation, import, and push happen only after you choose the relevant GitHub action. Settings shows how to disconnect and remove the saved local token.</p>

        <h2>APK and ZIP editor</h2>
        <p>The APK section is a file editor and repackaging tool for APK or ZIP archives. It can browse archive entries, edit supported text resources such as XML, JSON, SMALI, properties, Gradle files, and text, then save a changed archive for download. It can prepare a changed resource archive, but it is not Android Studio, a full decompiler, an Android emulator, a signing service, or a guaranteed package-name editor for binary Android manifests.</p>

        <h2>Exporting and safe deletion</h2>
        <p>Use Download to export a project as a ZIP at any time. Export important work before deleting it. Workspace retention controls apply to the live workspace; a manual browser-data clear can also remove the local source mirror.</p>

        <div style={{ marginTop: "2rem", padding: "1rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>Need help with a project?</p>
          <p>Select the relevant file, open AI or AI Terminal, and ask for a plan before approving a workspace action.</p>
        </div>
        <PublicFooter />
      </div>
    </div>
  )
}
