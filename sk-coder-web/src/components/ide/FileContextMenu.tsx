import { useState, useRef, useEffect } from "react"
import { MoreVertical, Download, Trash2, Edit2, Copy, Play } from "lucide-react"
import { useIDEStore } from "@/store/ideStore"
import { saveFile } from "@/lib/storageManager"
import { toast } from "sonner"

interface FileContextMenuProps {
  fileId: string
  fileName: string
  filePath: string
  isFile: boolean
}

export default function FileContextMenu({ fileId, fileName, filePath, isFile }: FileContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { deleteNode, renameNode, getFileContent, setActivePanel } = useIDEStore()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleDownload = async () => {
    if (!isFile) return

    const content = getFileContent(filePath) ?? ""
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    toast.success("File downloaded")
    setIsOpen(false)
  }

  const handleDelete = () => {
    if (confirm(`Delete ${fileName}?`)) {
      deleteNode(filePath)
      toast.success("File deleted")
      setIsOpen(false)
    }
  }

  const handleRename = () => {
    const newName = prompt("New name:", fileName)
    if (newName && newName !== fileName) {
      renameNode(filePath, newName)
      toast.success("File renamed")
      setIsOpen(false)
    }
  }

  const handleCopy = () => {
    const content = getFileContent(filePath) ?? ""
    navigator.clipboard.writeText(content)
    toast.success("Copied to clipboard")
    setIsOpen(false)
  }

  const handleExecute = () => {
    if (isFile) {
      setActivePanel("terminal")
      toast.info("Open terminal to execute")
    }
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-surface rounded transition-colors"
        title="File options"
      >
        <MoreVertical className="w-4 h-4 text-muted" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg z-50">
          {isFile && (
            <>
              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-background text-sm text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-background text-sm text-foreground transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Content
              </button>
              <button
                onClick={handleExecute}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-background text-sm text-foreground transition-colors"
              >
                <Play className="w-4 h-4" />
                Execute
              </button>
              <div className="border-t border-border" />
            </>
          )}

          <button
            onClick={handleRename}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-background text-sm text-foreground transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Rename
          </button>

          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-background text-sm text-foreground text-error transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
