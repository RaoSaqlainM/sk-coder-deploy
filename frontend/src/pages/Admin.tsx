import { useEffect, useState } from "react";
const API_BASE = import.meta.env.VITE_API_URL || "/api";
type Summary = {
    generatedAt: number;
    activeRuntimeSessions: number;
    capacity: {
        workspaceMaxBytes: number;
        sessionMaxBytes: number;
        safetyReserveBytes: number;
        disk: string | null;
    };
    workspaces: {
        total: number;
        active: number;
        scheduledDelete: number;
        deleted: number;
        retainedQuotaBytes: number;
    };
};
type Workspace = {
    id: string;
    createdAt: number;
    lastHeartbeatAt: number;
    expiresAt: number;
    state: "active" | "scheduled-delete" | "deleted";
    quotaBytes: number;
    revision: number;
};
function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024 * 1024)
        return `${Math.round(bytes / (1024 * 1024))} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
function formatTime(timestamp: number) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}
export default function AdminPage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function load() {
        setLoading(true);
        setError("");
        try {
            const [summaryResponse, workspaceResponse] = await Promise.all([
                fetch(`${API_BASE}/admin/summary`),
                fetch(`${API_BASE}/admin/workspaces`),
            ]);
            if (!summaryResponse.ok || !workspaceResponse.ok) {
                const body = await summaryResponse.json().catch(() => ({}));
                throw new Error(body.error || "Administrator access was denied.");
            }
            setSummary(await summaryResponse.json());
            const payload = await workspaceResponse.json();
            setWorkspaces(payload.workspaces || []);
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Administrator data could not be loaded.");
        }
        finally {
            setLoading(false);
        }
    }
    async function scheduleDelete(workspace: Workspace) {
        const confirmation = window.prompt(`Type this workspace ID to schedule its deletion in four hours:\n${workspace.id}`);
        if (confirmation !== workspace.id)
            return;
        const response = await fetch(`${API_BASE}/admin/workspaces/${encodeURIComponent(workspace.id)}/schedule-delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmWorkspaceId: confirmation }),
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            setError(body.error || "Workspace cleanup could not be scheduled.");
            return;
        }
        await load();
    }
    useEffect(() => {
        void load();
    }, []);
    const capacityCards = summary ? [
        ["Active terminals", summary.activeRuntimeSessions],
        ["Active workspaces", summary.workspaces.active],
        ["Scheduled cleanup", summary.workspaces.scheduledDelete],
        ["Retained quota", formatBytes(summary.workspaces.retainedQuotaBytes)],
        ["Primary workspace target", formatBytes(summary.capacity.workspaceMaxBytes)],
        ["Safety reserve", formatBytes(summary.capacity.safetyReserveBytes)],
    ] : [];
    return (<main className="info-page">
      <header className="info-header">
        <h1>Administrator Dashboard</h1>
        <p>Oracle owner-only operational status for capacity and workspace cleanup.</p>
      </header>
      <section className="info-section">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
        {error && <p style={{ color: "var(--red)", marginTop: 12 }}>{error}</p>}
      </section>
      {summary && <>
          <section className="info-section">
            <h2>Capacity and activity</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {capacityCards.map(([label, value]) => <div key={String(label)} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-elevated)" }}><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div><strong style={{ fontSize: 20 }}>{String(value)}</strong></div>)}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12 }}>Last refresh: {formatTime(summary.generatedAt)}. Server disk report: {summary.capacity.disk || "unavailable"}.</p>
          </section>
          <section className="info-section">
            <h2>Server workspaces</h2>
            <p>This view contains operational IDs and timing only. It does not display source code, terminal text, API keys, or chat content.</p>
            <div style={{ overflowX: "auto" }}><table className="info-table"><thead><tr><th>Workspace</th><th>State</th><th>Last activity</th><th>Expiry</th><th>Quota</th><th>Action</th></tr></thead><tbody>{workspaces.map((workspace) => <tr key={workspace.id}><td style={{ fontFamily: "var(--font-code)", fontSize: 11 }}>{workspace.id}</td><td>{workspace.state}</td><td>{formatTime(workspace.lastHeartbeatAt)}</td><td>{formatTime(workspace.expiresAt)}</td><td>{formatBytes(workspace.quotaBytes)}</td><td>{workspace.state === "active" ? <button className="btn btn-ghost" onClick={() => void scheduleDelete(workspace)}>Schedule four-hour cleanup</button> : "—"}</td></tr>)}</tbody></table></div>
          </section>
        </>}
    </main>);
}
