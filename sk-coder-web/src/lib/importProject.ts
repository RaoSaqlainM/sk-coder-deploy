import JSZip from "jszip"
import type { FileNode } from "../types/ide"

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", cpp: "cpp", c: "c", h: "cpp", html: "html", htm: "html",
    css: "css", scss: "scss", json: "json", yaml: "yaml", yml: "yaml",
    xml: "xml", md: "markdown", sh: "shell", java: "java", kt: "kotlin",
    rs: "rust", go: "go", rb: "ruby", php: "php", swift: "swift",
    dart: "dart", sql: "sql", r: "r", txt: "plaintext",
    env: "plaintext", toml: "toml", ini: "ini",
  }
  return map[ext] || "plaintext"
}

const SKIP_ENTRIES = new Set([
  "__MACOSX", ".DS_Store", "Thumbs.db", ".git",
  "node_modules", ".next", "dist", "build", ".cache", ".venv",
])

function shouldSkip(name: string): boolean {
  return SKIP_ENTRIES.has(name) || name.startsWith(".")
}

export async function importFromZip(file: File): Promise<FileNode[]> {
  try {
    const zip = await JSZip.loadAsync(file)
    const sortedPaths = Object.keys(zip.files).sort()

    const pathMap = new Map<string, FileNode>()
    const roots: FileNode[] = []

    for (const relativePath of sortedPaths) {
      const zipFile = zip.files[relativePath]
      const parts = relativePath.split("/").filter(Boolean)
      if (parts.length === 0) continue
      if (parts.some(shouldSkip)) continue

      let parentNode: FileNode | null = null
      let currentPath = ""

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isLast = i === parts.length - 1
        const childPath = currentPath ? `${currentPath}/${part}` : `/${part}`

        if (!pathMap.has(childPath)) {
          const isFile = isLast && !zipFile.dir
          const newNode: FileNode = {
            id: generateId(),
            name: part,
            type: isFile ? "file" : "folder",
            path: childPath,
            language: isFile ? getLanguage(part) : undefined,
            children: isFile ? undefined : [],
          }
          if (isFile) {
            try {
              newNode.content = await zipFile.async("string")
            } catch (err) {
              console.error(`Failed to read ${relativePath}:`, err)
              newNode.content = ""
            }
          }
          pathMap.set(childPath, newNode)
          if (parentNode) {
            if (!parentNode.children) parentNode.children = []
            parentNode.children.push(newNode)
          } else {
            roots.push(newNode)
          }
        }

        parentNode = pathMap.get(childPath)!
        currentPath = childPath
      }
    }

    return roots
  } catch (err) {
    console.error("ZIP import error:", err)
    throw new Error(`Failed to import ZIP: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function importFromFiles(files: FileList): Promise<FileNode[]> {
  const hasStructure = Array.from(files).some(
    (f) => ((f as File & { webkitRelativePath?: string }).webkitRelativePath || "").includes("/")
  )

  if (!hasStructure) {
    const nodes: FileNode[] = []
    for (const file of Array.from(files)) {
      if (shouldSkip(file.name)) continue
      let content = ""
      try {
        content = await file.text()
      } catch {
        content = ""
      }
      nodes.push({
        id: generateId(),
        name: file.name,
        type: "file",
        path: `/${file.name}`,
        content,
        language: getLanguage(file.name),
      })
    }
    return nodes
  }

  const pathMap = new Map<string, FileNode>()
  const roots: FileNode[] = []

  for (const file of Array.from(files)) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
    const parts = relativePath.split("/").filter(Boolean)
    if (parts.some(shouldSkip)) continue

    let parentNode: FileNode | null = null
    let currentPath = ""

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const childPath = currentPath ? `${currentPath}/${part}` : `/${part}`

      if (!pathMap.has(childPath)) {
        const isFile = isLast
        const newNode: FileNode = {
          id: generateId(),
          name: part,
          type: isFile ? "file" : "folder",
          path: childPath,
          language: isFile ? getLanguage(part) : undefined,
          children: isFile ? undefined : [],
        }
        if (isFile) {
          try {
            newNode.content = await file.text()
          } catch {
            newNode.content = ""
          }
        }
        pathMap.set(childPath, newNode)
        if (parentNode) {
          if (!parentNode.children) parentNode.children = []
          parentNode.children.push(newNode)
        } else {
          roots.push(newNode)
        }
      }

      parentNode = pathMap.get(childPath)!
      currentPath = childPath
    }
  }

  return roots
}

export async function exportToZip(nodes: FileNode[]): Promise<Blob> {
  const zip = new JSZip()
  function addToZip(node: FileNode, prefix = "") {
    if (node.type === "file") {
      zip.file(prefix + node.name, node.content || "")
    } else {
      const folderPath = prefix + node.name + "/"
      for (const child of node.children || []) {
        addToZip(child, folderPath)
      }
    }
  }
  for (const node of nodes) {
    addToZip(node)
  }
  return await zip.generateAsync({ type: "blob", compression: "DEFLATE" })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
