import { Link, useLocation } from "wouter"

type InformationKind = "guide" | "privacy" | "terms"

const pageContent: Record<InformationKind, { title: string; eyebrow: string; intro: string; sections: { title: string; paragraphs: string[] }[] }> = {
  guide: {
    title: "SK Coder User Guide",
    eyebrow: "Simple help for every user",
    intro: "This guide explains the main parts of SK Coder in plain words.",
    sections: [
      { title: "Files and Editor", paragraphs: ["Start in Files. Import or create a file there.", "Double-click a code file to show Editor beside Files. Double-click inside Editor to show or hide Files again."] },
      { title: "Preview", paragraphs: ["Use Preview on an HTML file to see its project page. Images, videos, audio files, and PDFs can also open in Preview.", "For a project, open its HTML file. Its nearby images, sounds, and videos are included when they were imported with the project."] },
      { title: "Run and results", paragraphs: ["Use Run only when it appears for the file you opened. The answer shows in Result Center.", "If a file needs a workspace or a different program, SK Coder tells you instead of showing a fake result."] },
      { title: "Terminal and AI", paragraphs: ["SK Shell is for terminal commands and project work when a workspace is connected.", "SK Coder AI Assistant can explain code and suggest changes. It asks before changing files, running code, or opening a preview."] },
      { title: "Save your work", paragraphs: ["Download a ZIP of important work. Browser-only files can be lost if you clear site data.", "Use a small-permission GitHub token and select only the repositories you need."] },
      { title: "Limits", paragraphs: ["Your browser decides which audio and video codecs it can play. A file can be recognized but still need another player if its internal codec is unusual.", "Large projects, package installs, desktop apps, games, and special file formats may need SK Shell or another app."] },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Your files and connections",
    intro: "This page explains, in simple words, where your data goes when you choose to use a feature.",
    sections: [
      { title: "Your local files", paragraphs: ["Your browser keeps local workspace files when possible. Download a ZIP before clearing browser site data.", "Media and PDFs selected for Preview are stored with the matching local workspace entry so they can be shown again."] },
      { title: "Connected services", paragraphs: ["When you choose GitHub, AI, or a live workspace action, only the words or files needed for that action are sent to that service.", "Those connected services have their own privacy rules."] },
      { title: "Keys and tokens", paragraphs: ["Your AI keys and GitHub tokens stay in this browser until you remove them.", "Treat a key or token like a password. Do not share it with anyone you do not trust."] },
    ],
  },
  terms: {
    title: "Terms of Use",
    eyebrow: "Using SK Coder fairly",
    intro: "These short rules help keep your work and connected services safe.",
    sections: [
      { title: "Your work", paragraphs: ["Use SK Coder for work you are allowed to create, edit, preview, or run.", "Keep your own copies of important files."] },
      { title: "Connected tools", paragraphs: ["Follow the rules of GitHub, your AI provider, and any workspace or hosting service that you connect.", "Extra services can have their own limits, costs, and rules."] },
      { title: "Honest results", paragraphs: ["SK Coder shows when a file, runtime, or browser format cannot work in the current place.", "Do not rely on a preview as the only copy of your work."] },
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
            {(["guide", "privacy", "terms"] as InformationKind[]).map((item) => <Link key={item} href={`/${item}`} style={{ padding: "0.42rem 0.6rem", borderRadius: 7, color: location === `/${item}` ? "#0d1117" : "#c9d1d9", background: location === `/${item}` ? "#58a6ff" : "#21262d", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>{item === "guide" ? "User Guide" : item === "privacy" ? "Privacy" : "Terms"}</Link>)}
          </nav>
        </header>
        <section style={{ padding: "clamp(2rem, 7vw, 5rem) 0 2rem" }}>
          <div style={{ color: "#58a6ff", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{content.eyebrow}</div>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.6rem)", lineHeight: 1.06, margin: "0.75rem 0" }}>{content.title}</h1>
          <p style={{ maxWidth: 660, color: "#8b949e", fontSize: "clamp(1rem, 2vw, 1.15rem)", lineHeight: 1.7, margin: 0 }}>{content.intro}</p>
        </section>
        <section style={{ display: "grid", gap: "0.85rem", paddingBottom: "3rem" }}>
          {content.sections.map((section, index) => <article key={section.title} style={{ padding: "1.2rem", border: "1px solid #30363d", background: index % 2 ? "#161b22" : "#0d1117", borderRadius: 12 }}><h2 style={{ margin: "0 0 0.55rem", fontSize: 17 }}>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} style={{ margin: "0.45rem 0", color: "#c9d1d9", lineHeight: 1.7, fontSize: 14 }}>{paragraph}</p>)}</article>)}
        </section>
      </div>
    </main>
  )
}
