import { useState, useRef, useEffect } from "react"
import { Play, Eye, Trash2, Download, Copy, Move, Edit2, FolderPlus, FilePlus } from "lucide-react"
import { useIDEStore } from "@/store/ideStore"
import { toast } from "sonner"

interface RightClickMenuProps {
  node: any
  x: number
  y: number
  onClose: () => void
}

export default function RightClickMenu({ node, x, y, onClose }: RightClickMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const {
    deleteNode,
    renameNode,
    getFileContent,
    updateFileContent,
    moveNode,
    setActivePanel,
    addFile,
    setTerminalBridgeCmd,
  } = useIDEStore()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const handleDelete = () => {
    if (confirm(`Delete ${node.name}?`)) {
      deleteNode(node.path)
      toast.success("Deleted")
    }
    onClose()
  }

  const handleRename = () => {
    const newName = prompt("New name:", node.name)
    if (newName && newName !== node.name) {
      const newPath = node.path.substring(0, node.path.lastIndexOf("/")) + "/" + newName
      renameNode(node.path, newName)
      toast.success("Renamed")
    }
    onClose()
  }

  const handleDownload = () => {
    const content = getFileContent(node.path) ?? ""
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = node.name
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Downloaded")
    onClose()
  }

  const handleCopy = () => {
    const content = getFileContent(node.path) ?? ""
    navigator.clipboard.writeText(content)
    toast.success("Copied")
    onClose()
  }

  const handleRun = () => {
    if (node.type === "file") {
      setTerminalBridgeCmd({
        cmd: `run ${node.name}`,
        targetType: "shell",
      })
      setActivePanel("terminal")
      toast.success("Running in terminal...")
    }
    onClose()
  }

  const handlePreview = () => {
    if (node.type === "file" && node.name.endsWith(".html")) {
      setActivePanel("preview")
      toast.success("Opening preview...")
    }
    onClose()
  }

  const handleNewFile = () => {
    const fileName = prompt("File name:")
    if (fileName) {
      addFile(node.type === "folder" ? node.path : node.path.substring(0, node.path.lastIndexOf("/")), fileName, "file", "")
      toast.success("File created")
    }
    onClose()
  }

  const handleNewFolder = () => {
    const folderName = prompt("Folder name:")
    if (folderName) {
      addFile(node.type === "folder" ? node.path : node.path.substring(0, node.path.lastIndexOf("/")), folderName, "folder")
      toast.success("Folder created")
    }
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10000,
      }}
    >
      {node.type === "file" && (
        <>
          <button onClick={handleRun} className="context-menu-item">
            <Play size={14} /> Run
          </button>
          {node.name.endsWith(".html") && (
            <button onClick={handlePreview} className="context-menu-item">
              <Eye size={14} /> Preview
            </button>
          )}
          <button onClick={handleCopy} className="context-menu-item">
            <Copy size={14} /> Copy
          </button>
          <button onClick={handleDownload} className="context-menu-item">
            <Download size={14} /> Download
          </button>
          <hr />
        </>
      )}

      <button onClick={handleRename} className="context-menu-item">
        <Edit2 size={14} /> Rename
      </button>

      {node.type === "folder" && (
        <>
          <button onClick={handleNewFile} className="context-menu-item">
            <FilePlus size={14} /> New File
          </button>
          <button onClick={handleNewFolder} className="context-menu-item">
            <FolderPlus size={14} /> New Folder
          </button>
          <hr />
        </>
      )}

      <button onClick={handleDelete} className="context-menu-item context-menu-danger">
        <Trash2 size={14} /> Delete
      </button>
    </div>
  )
}
