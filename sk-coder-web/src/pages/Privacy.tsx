import { useLocation } from "wouter"
import PublicFooter from "@/components/PublicFooter"

export default function PrivacyPage() {
  const [, navigate] = useLocation()

  return (
    <div className="page-layout">
      <div className="page-content">
        <button className="page-back" onClick={() => navigate("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to SK Coder
        </button>

        <h1>Privacy Policy</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Last updated: August 2026</p>

        <h2>Overview</h2>
        <p>SK Coder is a browser-based coding workspace. This policy explains how project data, connection settings, and optional third-party services are used when you choose to use them.</p>

        <h2>Your project data</h2>
        <p>SK Coder keeps a browser-local project mirror to support editing and export. Clearing browser site data can remove that local mirror, so export important work as a ZIP file.</p>
        <p>When you start a live workspace or run a file, the files needed for that requested action may be sent to the selected execution service. Do not place secrets, private keys, or production credentials in projects unless you understand and accept the destination you choose.</p>

        <h2>AI and GitHub connections</h2>
        <p>If you connect an AI provider, the messages and workspace excerpts needed for your request are sent to that provider. SK Coder AI uses a bounded active-file-first context and asks for approval before it proposes workspace actions.</p>
        <p>If you connect GitHub, the repository access token is used only for the GitHub actions you request. Use a fine-grained token, restrict it to selected repositories, grant the minimum permissions, and set an expiry.</p>

        <h2>Keys and settings</h2>
        <p>Settings and connection keys are stored in browser storage associated with this application. Treat API keys and GitHub tokens as passwords. Use short-lived, least-privilege credentials and remove them from Settings when they are no longer needed.</p>

        <h2>Advertising and public pages</h2>
        <p>SK Coder does not place advertising inside the editor, terminal, preview controls, Result Center, or workspace navigation. If advertising is enabled on public Help or policy pages in the future, it will be visually separate from product controls and governed by the provider's own privacy notice.</p>

        <h2>Children and changes</h2>
        <p>SK Coder is not designed to knowingly collect personal data from children. This policy may change as product features change. The updated version will be posted at this address with a new date.</p>

        <h2>Contact</h2>
        <p>For privacy questions, use the project’s GitHub contact channel.</p>
        <PublicFooter />
      </div>
    </div>
  )
}
