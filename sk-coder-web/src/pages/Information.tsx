import { Link, useLocation } from "wouter"

type InformationKind = "guide" | "privacy" | "terms"
type InformationSection = { title: string; paragraphs: string[]; items?: string[] }
type InformationContent = { title: string; eyebrow: string; intro: string; sections: InformationSection[] }

const pageContent: Record<InformationKind, InformationContent> = {
  guide: {
    title: "SK Coder User Manual",
    eyebrow: "Complete workspace and capability guide",
    intro: "SK Coder detects the file you choose and gives the matching action: edit, Preview, Run, open in Terminal, or a clear message when that action is not available.",
    sections: [
      {
        title: "Start with Files",
        paragraphs: ["Use Files to create, import, rename, copy, move, download, or delete files and folders. On a phone, tap once to select a file and tap again quickly to open it. On desktop, use the same two-click action or open More options.", "When you open editable code, Explorer and Editor can appear together. Double-click inside the code editor to show or hide Explorer without closing your work."],
      },
      {
        title: "Preview the selected file",
        paragraphs: ["Preview always follows the file you selected. It does not reuse an old editor file. Choose Preview for HTML, an image, a video, sound, or a PDF to see that exact file.", "For an HTML project, import the HTML file together with its CSS, JavaScript, images, videos, and audio. Open the HTML file, then choose Preview. Nearby imported assets are included in the Preview when their paths match the project file."],
        items: ["Images: PNG, JPG/JPEG, WebP, GIF, SVG, BMP, ICO, AVIF, and other browser-readable image files.", "Video: MP4, WebM, MOV, MKV, AVI, OGV/OGG, MPEG, 3GP, and other detected video files. Playback depends on the codec inside the file and the user’s browser.", "Audio: MP3, WAV, OGG/OGA, OPUS, M4A, AAC, FLAC, AIFF, and other detected audio files. Preview shows normal play, pause, seek, and volume controls.", "Documents: PDF opens in a document viewer. If an old local workspace entry lacks the original binary file, choose the original file once to restore its Preview."],
      },
      {
        title: "Run source files",
        paragraphs: ["The Run control appears only when SK Coder detects a supported source file. Results go directly to Result Center, where you can read Console, Problems, Files Produced, and Run details.", "Program input is available in Result Center for source files that read values from standard input. Enter each value on a new line, then run again with those values."],
        items: ["C and C++: .c, .cc, .cpp, and .cxx source files can use a compile-and-run path.", "Java and Kotlin: .java, .kt, and .kts files can use a Java or Kotlin run path when a compatible runtime is available.", "Python: .py files can use a Python source run path. Browser-only Python has limits; full projects need a ready workspace.", "JavaScript and TypeScript: .js, .mjs, .cjs, .ts, and .tsx files can use the available source or workspace path. A multi-file web project should usually be Previewed or opened in SK Shell.", "Rust, Go, PHP, Ruby, shell, and Bash: source files are recognized for workspace execution when the required runtime is ready."],
      },
      {
        title: "Projects and folders",
        paragraphs: ["A project is more than one source file. Open the project folder in SK Shell when you need folders, dependencies, package installation, build tools, a development server, or a long-running process.", "SK Coder recognizes common project markers and can guide you to the correct workspace route. It does not claim that a project ran when its required workspace is unavailable."],
        items: ["Node.js projects: package.json, including Vite, React, Next.js, and NestJS projects.", "Rust projects: Cargo.toml. Go projects: go.mod. Java projects: pom.xml or build.gradle. C/C++ projects: CMakeLists.txt or Makefile.", "Python projects: requirements.txt, pyproject.toml, or a normal source folder. PHP projects: composer.json. Ruby projects: Gemfile.", "Mobile, desktop, game, emulator, native GUI, and platform-specific projects may require tools that cannot run inside a browser Preview."],
      },
      {
        title: "Terminal, AI, and GitHub",
        paragraphs: ["SK Shell is the full terminal. It is the place for changing folders, working with project files, package commands, builds, and interactive commands when a workspace connection is ready.", "SK Coder AI Assistant can explain selected code and propose edits. It asks before changing files, running commands, or opening a preview. GitHub import and push use a fine-grained token; choose only the repositories and permissions you need."],
        items: ["For importing a repository, use repository Metadata: Read and Contents: Read. Add Contents: Read and write only when you need to push file changes.", "Add Pull requests: Read and write only when you need to work with pull requests. Add Workflows: Read and write only when you intentionally edit GitHub Actions files.", "Do not grant Administration access unless you are managing repository settings. Select only the repositories you intend to use."],
      },
      {
        title: "Archives, APKs, and saving work",
        paragraphs: ["ZIP-compatible archives such as ZIP, JAR, APK, XAPK, APKS, WAR, EAR, and AAR can be extracted into a same-named folder. Use Extract only when you want to browse the archive contents.", "APK Editor can browse supported archive entries, edit supported text resources, replace supported image resources, and rebuild a downloadable archive. Binary Android manifest and package-name changes need specialized server-side tooling and are not pretended to work in the browser."],
      },
      {
        title: "Important limits",
        paragraphs: ["A file extension tells SK Coder which action to try, but the real result depends on the file content, browser support, and whether the needed runtime is ready. A detected video or audio file can still fail to play if its codec is not supported by the browser.", "Keep a downloaded ZIP copy of important work. Browser data can be removed if site data is cleared. For very large projects, packages, game engines, desktop applications, or unusual native formats, use the appropriate workspace or another local development tool."],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "How your files and connections are handled",
    intro: "This page explains where your information stays and when it is shared because you chose a feature that needs it.",
    sections: [
      { title: "Local workspace data", paragraphs: ["Files you create or import are stored in your browser workspace when possible. Previewable images, media, and PDFs are kept with the matching local file entry so they can open again.", "Clear browser site data only after downloading a ZIP copy of work you want to keep. Clearing site data can remove locally stored workspace information."] },
      { title: "Preview files", paragraphs: ["Preview reads the file you selected. For an HTML project, matching local assets are used only to build that project Preview.", "If an old media or PDF entry has no saved binary data, the app asks you to choose the original file. That chosen file is used to restore that entry’s local Preview."] },
      { title: "AI requests", paragraphs: ["SK Coder AI Assistant receives the prompt and the user-approved workspace context needed for the request. It proposes actions before it edits files, runs code, or opens Preview.", "Your AI provider may have its own privacy policy. Read it before adding a key."] },
      { title: "GitHub and workspaces", paragraphs: ["GitHub actions use the token and repository permissions you choose. Use a fine-grained token with the smallest permission set that works for your task.", "A workspace command sends only the files and command needed for that workspace action. Connected services can have their own retention and privacy rules."] },
      { title: "Keys and tokens", paragraphs: ["AI keys and GitHub tokens are sensitive. Treat them like passwords and remove them from Settings when you no longer need them.", "Do not paste another person’s token into SK Coder or share your own token in screenshots, chats, or public code."] },
      { title: "Your choices", paragraphs: ["You control when to import a file, connect a service, send a command, approve an AI action, download a ZIP, or remove local information.", "Use the privacy controls in each connected service if you need to manage data held by that service."] },
    ],
  },
  terms: {
    title: "Terms of Use",
    eyebrow: "Rules for using SK Coder",
    intro: "These terms explain the safe and honest way to use SK Coder and connected services.",
    sections: [
      { title: "Your responsibility", paragraphs: ["Use SK Coder only with files, code, repositories, media, and services that you are allowed to use.", "Keep your own backups. A Preview, console result, browser cache, or temporary workspace is not the only copy you should rely on."] },
      { title: "Honest capabilities", paragraphs: ["SK Coder detects a useful action from the selected file type, but it does not promise that every file, project, codec, dependency, package, or native application can run in every environment.", "When a browser format, runtime, or workspace is unavailable, the app should show that condition instead of inventing a result."] },
      { title: "Connected services", paragraphs: ["Follow the rules of GitHub, your AI provider, and any workspace, hosting, or package service you connect.", "Those services can have their own usage limits, acceptable-use rules, privacy terms, costs, and availability conditions."] },
      { title: "Security", paragraphs: ["Protect your API keys, GitHub tokens, downloaded archives, and private source files. Use the smallest possible permission set for any token.", "Review AI action proposals before approving them. Do not approve an action that you do not understand or trust."] },
      { title: "Updates and support", paragraphs: ["Features can change as browsers, runtimes, and connected services change. Read the User Guide after updates to understand current behavior and limits.", "If a file does not behave as expected, keep the file, the error message, and the steps to reproduce the issue before reporting it."] },
    ],
  },
}

export default function InformationPage({ kind }: { kind: InformationKind }) {
  const [location] = useLocation()
  const content = pageContent[kind]

  return (
    <main style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "var(--font-ui)", padding: "clamp(1rem, 4vw, 3rem)" }}>
      <div style={{ width: "min(900px, 100%)", margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", paddingBottom: "1.2rem", borderBottom: "1px solid #30363d" }}>
          <Link href="/" style={{ color: "#58a6ff", textDecoration: "none", fontWeight: 700 }}>← Back to SK Coder</Link>
          <nav style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }} aria-label="Information pages">
            {(["guide", "privacy", "terms"] as InformationKind[]).map((item) => <Link key={item} href={`/${item}`} style={{ padding: "0.42rem 0.6rem", borderRadius: 7, color: location === `/${item}` ? "#0d1117" : "#c9d1d9", background: location === `/${item}` ? "#58a6ff" : "#21262d", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>{item === "guide" ? "User Manual" : item === "privacy" ? "Privacy" : "Terms"}</Link>)}
          </nav>
        </header>
        <section style={{ padding: "clamp(2rem, 7vw, 5rem) 0 2rem" }}>
          <div style={{ color: "#58a6ff", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{content.eyebrow}</div>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.6rem)", lineHeight: 1.06, margin: "0.75rem 0" }}>{content.title}</h1>
          <p style={{ maxWidth: 760, color: "#8b949e", fontSize: "clamp(1rem, 2vw, 1.15rem)", lineHeight: 1.7, margin: 0 }}>{content.intro}</p>
        </section>
        <section style={{ display: "grid", gap: "0.85rem", paddingBottom: "3rem" }}>
          {content.sections.map((section, index) => <article key={section.title} style={{ padding: "1.2rem", border: "1px solid #30363d", background: index % 2 ? "#161b22" : "#0d1117", borderRadius: 12 }}><h2 style={{ margin: "0 0 0.55rem", fontSize: 17 }}>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} style={{ margin: "0.45rem 0", color: "#c9d1d9", lineHeight: 1.7, fontSize: 14 }}>{paragraph}</p>)}{section.items?.length ? <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.2rem", color: "#c9d1d9", lineHeight: 1.65, fontSize: 13 }}>{section.items.map((item) => <li key={item} style={{ margin: "0.35rem 0" }}>{item}</li>)}</ul> : null}</article>)}
        </section>
      </div>
    </main>
  )
}
