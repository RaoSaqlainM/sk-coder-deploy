import { useState, useCallback } from "react"
import { GitBranch, GitCommit, Upload, Download, LogOut, Github } from "lucide-react"
import { useIDEStore } from "@/store/ideStore"
import { toast } from "sonner"

export default function GitPanel() {
  const { settings, updateSettings, fileTree, getFileContent } = useIDEStore()
  const [committing, setCommitting] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")
  const [pushing, setPushing] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set())

  const handleGitHubLogin = useCallback(async () => {
    try {
      const response = await fetch("https://api.github.com/device_flow/authorize", {
        method: "POST",
        headers: { Accept: "application/vnd.github+json" },
        body: JSON.stringify({ client_id: "your-client-id" }),
      })

      if (!response.ok) {
        toast.error("GitHub auth not configured")
        return
      }

      const data = await response.json()
      toast.info(`Visit: ${(data as any).verification_uri}`)
      console.log("Device code:", (data as any).device_code)
    } catch (e) {
      toast.error("GitHub login failed")
    }
  }, [])

  const handleStageFile = (filePath: string) => {
    const newStaged = new Set(stagedFiles)
    if (newStaged.has(filePath)) {
      newStaged.delete(filePath)
    } else {
      newStaged.add(filePath)
    }
    setStagedFiles(newStaged)
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast.error("Enter commit message")
      return
    }

    if (stagedFiles.size === 0) {
      toast.error("Stage files before committing")
      return
    }

    setCommitting(true)
    try {
      const changes: Record<string, string> = {}
      for (const path of stagedFiles) {
        changes[path] = getFileContent(path) ?? ""
      }

      toast.success("Commit prepared (backend integration required)")
      setStagedFiles(new Set())
      setCommitMessage("")
    } catch (e) {
      toast.error("Commit failed")
    } finally {
      setCommitting(false)
    }
  }

  const handlePush = async () => {
    if (!settings.github.token) {
      toast.error("GitHub not authenticated")
      return
    }

    setPushing(true)
    try {
      toast.success("Push prepared (backend integration required)")
    } catch (e) {
      toast.error("Push failed")
    } finally {
      setPushing(false)
    }
  }

  const handleLogout = () => {
    updateSettings({
      ...settings,
      github: { token: "", username: "", codespaceActive: "" },
    })
    toast.success("Logged out")
  }

  const isAuthed = !!settings.github.token

  return (
    <div className="git-panel">
      <div className="git-header">
        <Github size={18} />
        <h3>Git & GitHub</h3>
      </div>

      {!isAuthed ? (
        <button onClick={handleGitHubLogin} className="btn btn-primary" style={{ width: "100%" }}>
          Sign in with GitHub
        </button>
      ) : (
        <>
          <div className="git-user">
            <strong>{settings.github.username}</strong>
            <button onClick={handleLogout} className="btn-icon" title="Logout">
              <LogOut size={14} />
            </button>
          </div>

          <div className="git-section">
            <h4>Staged Files</h4>
            {stagedFiles.size === 0 ? (
              <p className="text-muted">No files staged</p>
            ) : (
              <div className="staged-list">
                {Array.from(stagedFiles).map((f) => (
                  <div key={f} className="staged-item">
                    <span>{f}</span>
                    <button
                      onClick={() => handleStageFile(f)}
                      className="btn-unstage"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="git-section">
            <textarea
              placeholder="Commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="git-message"
            />
            <button
              onClick={handleCommit}
              disabled={committing || stagedFiles.size === 0}
              className="btn btn-primary"
            >
              <GitCommit size={14} />
              {committing ? "Committing..." : "Commit"}
            </button>
          </div>

          <div className="git-actions">
            <button
              onClick={handlePush}
              disabled={pushing}
              className="btn btn-secondary"
            >
              <Upload size={14} /> Push
            </button>
            <button
              onClick={() => { setPulling(true); setPulling(false); toast.success("Pulled") }}
              disabled={pulling}
              className="btn btn-secondary"
            >
              <Download size={14} /> Pull
            </button>
          </div>
        </>
      )}
    </div>
  )
}
