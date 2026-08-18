import { useLocation } from "wouter"
import PublicFooter from "@/components/PublicFooter"

export default function TermsPage() {
  const [, navigate] = useLocation()

  return (
    <div className="page-layout">
      <div className="page-content">
        <button className="page-back" onClick={() => navigate("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to SK Coder
        </button>

        <h1>Terms of Service</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Last updated: August 2026</p>

        <h2>Acceptance and use</h2>
        <p>By using SK Coder, you agree to these terms. You may use the service for personal or commercial coding work, subject to applicable law and the terms of any service you choose to connect.</p>

        <h2>Your responsibility</h2>
        <p>You are responsible for the code, files, commands, generated output, credentials, and external services you use. Review AI suggestions, terminal commands, and generated files before using them in a production environment.</p>

        <h2>Acceptable use</h2>
        <p>You must not use SK Coder to violate law, infringe intellectual property rights, distribute malicious software, compromise systems, evade security controls, or misuse a connected third-party service.</p>

        <h2>Availability and data</h2>
        <p>Features may be unavailable, limited by the selected runtime, or require a compatible external account or key. Export important work regularly. SK Coder cannot guarantee that every language, package, project type, native graphical application, or mobile build will run in the browser.</p>

        <h2>Third-party services</h2>
        <p>AI providers, GitHub, live workspaces, and any other services you choose to connect are governed by their own terms and policies. You are responsible for understanding any provider charges, access permissions, and data handling before connecting them.</p>

        <h2>No warranty and liability</h2>
        <p>SK Coder is provided on an as-is and as-available basis. To the maximum extent allowed by law, the developer is not liable for data loss, service interruption, provider charges, production incidents, or indirect damages arising from use of the application.</p>

        <h2>Changes and contact</h2>
        <p>These terms may be updated when the product changes. Continued use after an update indicates acceptance of the revised terms. For questions, use the project’s GitHub contact channel.</p>
        <PublicFooter />
      </div>
    </div>
  )
}
