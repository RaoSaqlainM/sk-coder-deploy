import { useRef, useState, useMemo, memo } from "react"
import { MoreVertical } from "lucide-react"
import { useIDEStore } from "@/store/ideStore"
import { importFromArchive, importFromFiles, isZipCompatibleArchive, exportToZip, downloadBlob } from "@/lib/importProject"
import type { FileNode } from "@/types/ide"
import { toast } from "sonner"
import { isDirectPreviewFile } from "@/lib/projectCapabilities"

const EXT_COLORS: Record<string, string> = {
  html: "#e34c26", htm: "#e34c26", css: "#264de4", scss: "#cc6699", sass: "#cc6699",
  js: "#f7df1e", jsx: "#61dafb", ts: "#3178c6", tsx: "#3178c6",
  py: "#3572a5", cpp: "#00599c", c: "#555555", java: "#b07219",
  kt: "#7f52ff", rs: "#dea584", go: "#00add8", rb: "#cc342d",
  php: "#4f5d95", swift: "#ffac45", dart: "#00b4ab",
  md: "#083fa1", json: "#cbcb41", yaml: "#cb171e", yml: "#cb171e",
  xml: "#e37933", sh: "#4eaa25", sql: "#e38c00",
  vue: "#42b883", svelte: "#ff3e00",
}

function countByExt(nodes: FileNode[]): Record<string, number> {
  const counts: Record<string, number> = {}
  function walk(ns: FileNode[]) {
    for (const n of ns) {
      if (n.type === "file") {
        const ext = n.name.split(".").pop()?.toLowerCase() || "other"
        counts[ext] = (counts[ext] || 0) + 1
      }
      if (n.children) walk(n.children)
    }
  }
  walk(nodes)
  return counts
}

function LangStats({ nodes }: { nodes: FileNode[] }) {
  const stats = useMemo(() => {
    const counts = countByExt(nodes)
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    if (total === 0) return null
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 7)
    return { sorted, total }
  }, [nodes])

  if (!stats || stats.total === 0) return null

  return (
    <div className="lang-stats">
      <div className="lang-stats-bar">
        {stats.sorted.map(([ext, count]) => (
          <div
            key={ext}
            className="lang-stats-seg"
            style={{ width: `${(count / stats.total) * 100}%`, background: EXT_COLORS[ext] || "#888" }}
            title={`.${ext} — ${Math.round((count / stats.total) * 100)}%`}
          />
        ))}
      </div>
      <div className="lang-stats-list">
        {stats.sorted.map(([ext, count]) => (
          <span key={ext} className="lang-stat-item">
            <span style={{ color: EXT_COLORS[ext] || "#888" }}>●</span>
            <span>.{ext}</span>
            <span style={{ color: "var(--text-muted)" }}>{Math.round((count / stats.total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FileIcon({ node, expanded }: { node: FileNode; expanded?: boolean }) {
  if (node.type === "folder") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill={expanded ? "var(--accent)" : "#e8a853"} stroke="none">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
    )
  }
  const ext = node.name.split(".").pop()?.toLowerCase() || ""
  const colors: Record<string, string> = {
    ...EXT_COLORS,
    h: "#555555", gitignore: "var(--text-muted)", env: "var(--orange)", toml: "var(--orange)",
    png: "#3d90ff", jpg: "#3d90ff", jpeg: "#3d90ff", gif: "#3d90ff", svg: "#ffb13b",
    apng: "#3d90ff", webp: "#3d90ff", avif: "#3d90ff", bmp: "#3d90ff", ico: "#3d90ff", tif: "#3d90ff", tiff: "#3d90ff", heic: "#3d90ff", heif: "#3d90ff", mp4: "#a78bfa", m4v: "#a78bfa", webm: "#a78bfa", ogv: "#a78bfa", mov: "#a78bfa", mkv: "#a78bfa", avi: "#a78bfa", wmv: "#a78bfa", flv: "#a78bfa", mp3: "#38bdf8", wav: "#38bdf8", ogg: "#38bdf8", oga: "#38bdf8", opus: "#38bdf8", m4a: "#38bdf8", aac: "#38bdf8", flac: "#38bdf8", wma: "#38bdf8", aiff: "#38bdf8",
    txt: "var(--text-muted)", astro: "#ff5a03",
  }
  const color = colors[ext] || "var(--text-muted)"
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" opacity="0.9"/>
      <polyline points="14 2 14 8 20 8" fill="rgba(0,0,0,0.2)" stroke="none"/>
    </svg>
  )
}

type FileNodeProps = { node: FileNode; depth: number; activePath: string | undefined }

function selectedNodes(nodes: FileNode[], paths: Set<string>): FileNode[] {
  const result: FileNode[] = []
  function walk(items: FileNode[]) {
    for (const item of items) {
      if (paths.has(item.path)) result.push(item)
      if (item.children) walk(item.children)
    }
  }
  walk(nodes)
  return result
}

function FileNodeItem({ node, depth, activePath }: FileNodeProps) {
  const {
    openTab, expandedFolders, toggleFolder, setContextMenu,
    renameNodeId, setRenameNodeId, renameNode, moveNode, setDragOver, dragOverId,
    setActivePanel, setSidebarOpen, selectedPaths, selectionMode, batchOperation,
    setSelectionMode, toggleSelectedPath, moveNodes, copyNodes,
  } = useIDEStore()
  const [renameValue, setRenameValue] = useState(node.name)
  const [armedForOpen, setArmedForOpen] = useState(false)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openTapRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastOpenTapAtRef = useRef(0)
  const expanded = expandedFolders.has(node.path)

  function clearLongPress() {
    if (longPressRef.current) clearTimeout(longPressRef.current)
    longPressRef.current = null
  }

  function openFile() {
    if (openTapRef.current) clearTimeout(openTapRef.current)
    openTapRef.current = null
    lastOpenTapAtRef.current = 0
    setArmedForOpen(false)
    openTab(node)
    if (isDirectPreviewFile(node)) {
      setActivePanel("preview")
      setSidebarOpen(false)
      return
    }
    setActivePanel("editor")
    setSidebarOpen(true)
  }

  function handleClick(event: React.MouseEvent) {
    if (batchOperation && node.type === "folder") {
      const paths = Array.from(selectedPaths)
      const completed = batchOperation === "move" ? moveNodes(paths, node.path) : copyNodes(paths, node.path)
      if (completed) toast.success(`${batchOperation === "move" ? "Moved" : "Copied"} ${paths.length} item${paths.length === 1 ? "" : "s"}`)
      else toast.error("Choose a different destination folder")
      return
    }
    if (selectionMode || event.ctrlKey || event.metaKey) {
      setSelectionMode(true)
      toggleSelectedPath(node.path)
      return
    }
    if (node.type === "folder") {
      toggleFolder(node.path)
    } else {
      const now = Date.now()
      if (now - lastOpenTapAtRef.current < 420) {
        openFile()
        return
      }
      lastOpenTapAtRef.current = now
      setArmedForOpen(true)
      if (openTapRef.current) clearTimeout(openTapRef.current)
      openTapRef.current = setTimeout(() => {
        lastOpenTapAtRef.current = 0
        setArmedForOpen(false)
      }, 420)
    }
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (event.pointerType === "mouse") return
    clearLongPress()
    longPressRef.current = setTimeout(() => {
      setSelectionMode(true)
      if (!selectedPaths.has(node.path)) toggleSelectedPath(node.path)
      toast.info("Selection mode enabled")
    }, 550)
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node, isFolder: node.type === "folder" })
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (renameValue.trim() && renameValue !== node.name) renameNode(node.path, renameValue.trim())
      else setRenameNodeId(null)
    }
    if (e.key === "Escape") { setRenameNodeId(null); setRenameValue(node.name) }
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", node.path)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent) {
    if (node.type !== "folder") return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOver(node.id)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(null)
    if (node.type !== "folder") return
    const fromPath = e.dataTransfer.getData("text/plain")
    if (!fromPath || fromPath === node.path || node.path.startsWith(fromPath + "/")) return
    moveNode(fromPath, node.path)
    toast.success("Moved")
  }

  const isActive = activePath === node.path
  const isRenaming = renameNodeId === node.id
  const isDragOver = dragOverId === node.id

  return (
    <>
      <div
        className={`file-node ${isActive ? "active" : ""} ${armedForOpen ? "armed" : ""} ${isDragOver ? "drag-over" : ""} ${selectedPaths.has(node.path) ? "selected" : ""} ${batchOperation && node.type === "folder" ? "batch-target" : ""}`}
        style={{ paddingLeft: `${0.4 + depth * 1}rem` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        draggable={!selectionMode}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(null)}
        onDrop={handleDrop}
        title={node.path}
      >
        {node.type === "folder" && (
          <svg
            className={`file-node-chevron ${expanded ? "open" : ""}`}
            width="9" height="9" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        )}
        <span className="file-node-icon"><FileIcon node={node} expanded={expanded} /></span>
        {isRenaming ? (
          <div className="file-node-rename" onClick={(e) => e.stopPropagation()}>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={() => setRenameNodeId(null)}
              autoFocus
            />
          </div>
        ) : (
          <span className="file-node-name">{node.name}</span>
        )}
        <button
          className="btn-icon file-node-menu-btn"
          style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.6 }}
          title="More options"
          onClick={(e) => {
            e.stopPropagation()
            const rect = e.currentTarget.getBoundingClientRect()
            setContextMenu({ x: rect.left, y: rect.bottom, node, isFolder: node.type === "folder" })
          }}
        >
          <MoreVertical size={12} />
        </button>
      </div>
      {node.type === "folder" && expanded && node.children && (
        <>
          {node.children.map((child) => (
            <FileNodeItemMemo key={child.id} node={child} depth={depth + 1} activePath={activePath} />
          ))}
        </>
      )}
    </>
  )
}

const FileNodeItemMemo = memo(FileNodeItem)

export default function FileExplorer() {
  const {
    fileTree, setNewItem, importFiles, getActiveFile, selectionMode, selectedPaths,
    batchOperation, setSelectionMode, clearSelectedPaths, setBatchOperation, deleteNodes,
  } = useIDEStore()
  const importInputRef = useRef<HTMLInputElement>(null)
  const archiveInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [search, setSearch] = useState("")
  const activeFile = getActiveFile()

  async function handleSmartImport(files: FileList) {
    if (!files.length) return
    const selectedFiles = Array.from(files)
    const archives = selectedFiles.filter((file) => isZipCompatibleArchive(file.name))
    const regularFiles = selectedFiles.filter((file) => !isZipCompatibleArchive(file.name))
    const imported: FileNode[] = []
    const errors: string[] = []

    for (const archive of archives) {
      try {
        imported.push(...await importFromArchive(archive))
      } catch (error) {
        errors.push(`${archive.name}: ${error instanceof Error ? error.message : "could not be extracted"}`)
      }
    }

    if (regularFiles.length) {
      const transfer = new DataTransfer()
      regularFiles.forEach((file) => transfer.items.add(file))
      imported.push(...await importFromFiles(transfer.files))
    }

    if (imported.length) {
      importFiles(imported)
      const parts = [
        regularFiles.length ? `Imported ${regularFiles.length} file${regularFiles.length === 1 ? "" : "s"}` : "",
        archives.length - errors.length ? `extracted ${archives.length - errors.length} archive${archives.length - errors.length === 1 ? "" : "s"} into same-named folders` : "",
      ].filter(Boolean)
      toast.success(parts.join(" · "))
    }
    if (errors.length) {
      toast.error(errors.join(" · "))
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (!files.length) return
    await handleSmartImport(files)
  }

  function filterTree(nodes: FileNode[], query: string): FileNode[] {
    if (!query) return nodes
    const q = query.toLowerCase()
    const results: FileNode[] = []
    function walk(ns: FileNode[]) {
      for (const n of ns) {
        if (n.type === "file" && n.name.toLowerCase().includes(q)) results.push(n)
        if (n.children) walk(n.children)
      }
    }
    walk(nodes)
    return results
  }

  const displayTree = search ? filterTree(fileTree, search) : fileTree

  async function handleBatchDownload() {
    const nodes = selectedNodes(fileTree, selectedPaths)
    if (!nodes.length) return
    try {
      const blob = await exportToZip(nodes)
      downloadBlob(blob, nodes.length === 1 ? `${nodes[0].name}.zip` : "sk-coder-selection.zip")
      toast.success(`Downloaded ${nodes.length} selected item${nodes.length === 1 ? "" : "s"}`)
    } catch {
      toast.error("Could not create the download")
    }
  }

  function handleBatchDelete() {
    const paths = Array.from(selectedPaths)
    if (!paths.length) return
    if (!confirm(`Delete ${paths.length} selected item${paths.length === 1 ? "" : "s"}?`)) return
    deleteNodes(paths)
    toast.success(`Deleted ${paths.length} item${paths.length === 1 ? "" : "s"}`)
  }

  return (
    <div
      className="file-explorer"
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <div className="file-explorer-header">
        <span>Explorer</span>
        <div className="file-explorer-actions">
          <button className={`file-explorer-action-btn ${selectionMode ? "active" : ""}`} onClick={() => selectionMode ? clearSelectedPaths() : setSelectionMode(true)} title={selectionMode ? "Cancel selection" : "Select files and folders"} aria-pressed={selectionMode}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="m15 17 2 2 4-5"/></svg>
          </button>
          <button className="file-explorer-action-btn" onClick={() => setNewItem(null, "file")} title="New File">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </button>
          <button className="file-explorer-action-btn" onClick={() => setNewItem(null, "folder")} title="New Folder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          <button className="file-explorer-extract-btn" onClick={() => archiveInputRef.current?.click()} title="Extract a supported ZIP-compatible archive into a same-named folder">
            Extract
          </button>
          <button className="file-explorer-action-btn" onClick={() => importInputRef.current?.click()} title="Import files or supported archive">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </div>

      {selectionMode && (
        <div className="file-batch-bar">
          <div className="file-batch-summary">
            <strong>{selectedPaths.size}</strong> selected
            {batchOperation && <span>Choose a destination folder</span>}
          </div>
          <div className="file-batch-actions">
            {batchOperation ? (
              <button className="btn btn-secondary" onClick={() => setBatchOperation(null)}>Cancel move</button>
            ) : (
              <>
                <button className="btn btn-secondary" disabled={selectedPaths.size === 0} onClick={() => setBatchOperation("copy")}>Copy</button>
                <button className="btn btn-secondary" disabled={selectedPaths.size === 0} onClick={() => setBatchOperation("move")}>Move</button>
                <button className="btn btn-secondary" disabled={selectedPaths.size === 0} onClick={handleBatchDownload}>Download</button>
                <button className="btn btn-danger" disabled={selectedPaths.size === 0} onClick={handleBatchDelete}>Delete</button>
              </>
            )}
            <button className="btn btn-ghost" onClick={clearSelectedPaths}>Done</button>
          </div>
        </div>
      )}

      <div className="file-explorer-search">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..." style={{ width: "100%" }} />
      </div>

      <div className="file-tree">
        {dragActive && <div className="import-drop-zone drag-active" style={{ margin: "0.5rem" }}>Drop files or a ZIP-compatible archive here</div>}

        {displayTree.length === 0 && !dragActive && (
          <div className="panel-placeholder" style={{ padding: "1.5rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(0,122,204,0.12)", marginBottom: "0.5rem", boxShadow: "0 0 12px rgba(0,122,204,0.2)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <path d="M12 11v6" /><path d="M9 14h6" />
              </svg>
            </div>
            <p>{search ? "No files match" : "Drop files here or click +"}</p>
            {!search && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                <button className="btn btn-secondary" onClick={() => setNewItem(null, "file")}>+ New File</button>
                <button className="btn btn-ghost" onClick={() => importInputRef.current?.click()}>Import</button>
              </div>
            )}
          </div>
        )}

        {search
          ? displayTree.map((node) => <FileNodeItemMemo key={node.id} node={node} depth={0} activePath={activeFile?.path} />)
          : fileTree.map((node) => <FileNodeItemMemo key={node.id} node={node} depth={0} activePath={activeFile?.path} />)}
      </div>

      <LangStats nodes={fileTree} />

      <input
        ref={importInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={async (e) => { if (e.target.files) await handleSmartImport(e.target.files); e.target.value = "" }}
      />
      <input
        ref={archiveInputRef}
        type="file"
        accept=".zip,.jar,.apk,.xapk,.apks,.war,.ear,.aar"
        style={{ display: "none" }}
        onChange={async (e) => { if (e.target.files) await handleSmartImport(e.target.files); e.target.value = "" }}
      />
    </div>
  )
}
