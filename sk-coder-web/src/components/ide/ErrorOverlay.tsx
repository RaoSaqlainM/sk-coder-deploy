import { useState, useEffect } from "react"
import { X, Lightbulb, ChevronDown } from "lucide-react"
import { useIDEStore } from "@/store/ideStore"
import { sendAIMessage, buildSystemPrompt } from "@/lib/aiClient"
import { toast } from "sonner"

export default function ErrorOverlay() {
  const { errors, setErrors, settings, getActiveFile, updateFileContent } = useIDEStore()
  const [selectedError, setSelectedError] = useState(0)
  const [showFix, setShowFix] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState("")
  const [loading, setLoading] = useState(false)

  if (!errors || errors.length === 0) return null

  const error = errors[selectedError]
  if (!error) return null

  async function handleGetAIFix() {
    if (aiSuggestion) return
    if (!settings.ai.apiKey && !settings.ai.usePuter) {
      toast.error("Configure AI key in Settings")
      return
    }

    setLoading(true)
    try {
      const activeFile = getActiveFile()
      const messages = [
        {
          id: "1",
          role: "user" as const,
          content: `Fix this error in ${error.filename || "unknown file"}:\n\nError: ${error.message}\nLine ${error.line}: ${error.code}\n\nProvide the corrected code only, no explanation.`,
          timestamp: Date.now(),
        },
      ]

      const systemPrompt = buildSystemPrompt({
        activeFilePath: activeFile?.path,
        activeFileContent: activeFile?.content,
        fileTree: [],
      })

      const res = await sendAIMessage({
        key: settings.ai.apiKey,
        customEndpoint: settings.ai.apiEndpoint,
        customModel: settings.ai.model,
        messages,
        systemPrompt,
      })

      if (res.error) {
        toast.error(`AI Error: ${res.error}`)
      } else {
        setAiSuggestion(res.content)
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleApplyFix() {
    if (!aiSuggestion || !error.filename) return

    updateFileContent(error.filename, aiSuggestion)
    setErrors([])
    toast.success("Fix applied! Review and test the code.")
  }

  return (
    <div className="error-overlay">
      <div className="error-header">
        <div className="error-title">
          <span className="error-badge">● ERROR</span>
          <span>{error.message}</span>
        </div>
        <button onClick={() => setErrors([])} className="btn-icon">
          <X size={16} />
        </button>
      </div>

      <div className="error-details">
        <div className="error-meta">
          <span className="error-file">{error.filename || "unknown"}</span>
          <span className="error-line">Line {error.line}</span>
        </div>
        {error.code && (
          <pre className="error-code">{error.code}</pre>
        )}
        {error.suggestion && (
          <div className="error-suggestion">
            <strong>Hint:</strong> {error.suggestion}
          </div>
        )}
      </div>

      <div className="error-actions">
        {errors.length > 1 && (
          <div className="error-nav">
            <button
              onClick={() => setSelectedError(Math.max(0, selectedError - 1))}
              disabled={selectedError === 0}
            >
              ← Previous
            </button>
            <span>{selectedError + 1} / {errors.length}</span>
            <button
              onClick={() => setSelectedError(Math.min(errors.length - 1, selectedError + 1))}
              disabled={selectedError === errors.length - 1}
            >
              Next →
            </button>
          </div>
        )}

        <button
          onClick={() => { handleGetAIFix(); setShowFix(true) }}
          disabled={loading}
          className="btn btn-primary"
        >
          <Lightbulb size={14} />
          {loading ? "Thinking..." : "Fix with AI"}
        </button>
      </div>

      {showFix && (
        <div className="error-ai-fix">
          <div className="fix-header">
            <span>AI Suggestion</span>
            <button onClick={() => setShowFix(false)} className="btn-icon">
              <X size={14} />
            </button>
          </div>
          {aiSuggestion ? (
            <>
              <pre className="fix-code">{aiSuggestion}</pre>
              <button onClick={handleApplyFix} className="btn btn-success">
                Apply Fix
              </button>
            </>
          ) : (
            <div className="fix-loading">Getting AI suggestion...</div>
          )}
        </div>
      )}
    </div>
  )
}
