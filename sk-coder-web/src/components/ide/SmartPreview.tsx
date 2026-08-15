import { useIDEStore } from "@/store/ideStore"
import { useState, useEffect } from "react"

interface PreviewResult {
  type: "html" | "text" | "code" | "json" | "error"
  content: string
  language?: string
  timestamp?: number
}

export default function SmartPreview() {
  const { getActiveFile, previewContent, previewResult } = useIDEStore()
  const activeFile = getActiveFile()
  const [displayContent, setDisplayContent] = useState<PreviewResult | null>(null)

  useEffect(() => {
    if (previewResult) {
      if (previewResult.stderr && !previewResult.stdout) {
        setDisplayContent({
          type: "error",
          content: previewResult.stderr,
        })
        return
      }

      const ext = activeFile?.name?.split(".").pop()?.toLowerCase()

      if (["html", "htm"].includes(ext || "")) {
        setDisplayContent({
          type: "html",
          content: previewContent || previewResult.stdout,
        })
      } else if (["json"].includes(ext || "")) {
        try {
          const parsed = JSON.parse(previewResult.stdout || "{}")
          setDisplayContent({
            type: "json",
            content: JSON.stringify(parsed, null, 2),
            language: "json",
          })
        } catch {
          setDisplayContent({
            type: "text",
            content: previewResult.stdout || "(no output)",
          })
        }
      } else if (["md", "markdown"].includes(ext || "")) {
        setDisplayContent({
          type: "code",
          content: previewResult.stdout || "(no output)",
          language: "markdown",
        })
      } else {
        setDisplayContent({
          type: "text",
          content: previewResult.stdout || "(no output)",
        })
      }
    } else if (previewContent) {
      const ext = activeFile?.name?.split(".").pop()?.toLowerCase()
      if (["html", "htm"].includes(ext || "")) {
        setDisplayContent({
          type: "html",
          content: previewContent,
        })
      }
    }
  }, [previewResult, previewContent, activeFile?.name])

  if (!displayContent && !previewContent) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background text-muted">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm">No preview available</div>
          <div className="text-xs text-muted mt-2">Run code or open an HTML file to preview</div>
        </div>
      </div>
    )
  }

  if (displayContent?.type === "html") {
    return (
      <iframe
        srcDoc={displayContent.content}
        className="w-full h-full border-none bg-white"
        sandbox="allow-scripts allow-forms allow-same-origin"
      />
    )
  }

  if (displayContent?.type === "error") {
    return (
      <div className="w-full h-full p-6 bg-background overflow-auto">
        <div className="bg-error/10 border border-error rounded p-4">
          <div className="text-error font-600 mb-2">Execution Error</div>
          <pre className="text-xs text-foreground overflow-auto max-h-96 font-mono">
            {displayContent.content}
          </pre>
        </div>
      </div>
    )
  }

  if (displayContent?.type === "text" || displayContent?.type === "json") {
    return (
      <div className="w-full h-full p-6 bg-background overflow-auto">
        <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words">
          {displayContent.content}
        </pre>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6 bg-background overflow-auto">
      {previewContent && (
        <div className="text-foreground text-sm">{previewContent.substring(0, 1000)}</div>
      )}
    </div>
  )
}
