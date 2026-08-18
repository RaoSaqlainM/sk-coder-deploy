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

const ZIP_COMPATIBLE_ARCHIVE_EXTENSIONS = new Set([
  "zip", "jar", "apk", "xapk", "apks", "war", "ear", "aar",
])

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
const MAX_ARCHIVE_ENTRIES = 4000
const IMAGE_MIME_TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp", avif: "image/avif",
}

function shouldSkip(name: string): boolean {
  return SKIP_ENTRIES.has(name) || name.startsWith(".")
}

function imageMimeType(name: string): string | null {
  const extension = name.split(".").pop()?.toLowerCase() || ""
  return IMAGE_MIME_TYPES[extension] || null
}

function isImageFile(name: string): boolean {
  return Boolean(imageMimeType(name))
}

function toDataUrl(mimeType: string, base64: string) {
  return `data:${mimeType};base64,${base64}`
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image data"))
    reader.onerror = () => reject(new Error("Could not read image data"))
    reader.readAsDataURL(file)
  })
}

function archiveRootName(filename: string): string {
  return filename.replace(/\.(zip|jar|apk|xapk|apks|war|ear|aar)$/i, "") || "archive"
}

function rebaseArchiveNodes(nodes: FileNode[], rootName: string): FileNode {
  const rootPath = `/${rootName}`
  function rebase(node: FileNode, parentPath: string): FileNode {
    const path = `${parentPath}/${node.name}`
    return {
      ...node,
      id: generateId(),
      path,
      children: node.children?.map((child) => rebase(child, path)),
    }
  }
  return {
    id: generateId(),
    name: rootName,
    type: "folder",
    path: rootPath,
    children: nodes.map((node) => rebase(node, rootPath)),
  }
}

export function isZipCompatibleArchive(filename: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase() || ""
  return ZIP_COMPATIBLE_ARCHIVE_EXTENSIONS.has(extension)
}

export async function importFromArchive(file: File): Promise<FileNode[]> {
  if (!isZipCompatibleArchive(file.name)) {
    throw new Error("This archive format is not supported for browser extraction")
  }
  if (file.size > MAX_ARCHIVE_BYTES) {
    throw new Error("Archive is larger than the browser extraction limit")
  }
  const nodes = await importFromZip(file)
  return [rebaseArchiveNodes(nodes, archiveRootName(file.name))]
}

export async function importFromZip(file: File): Promise<FileNode[]> {
  try {
    const zip = await JSZip.loadAsync(file)
    const sortedPaths = Object.keys(zip.files).sort()
    if (sortedPaths.length > MAX_ARCHIVE_ENTRIES) {
      throw new Error("Archive contains too many entries for browser extraction")
    }

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
              const mimeType = imageMimeType(part)
              if (mimeType) newNode.assetData = toDataUrl(mimeType, await zipFile.async("base64"))
              else newNode.content = await zipFile.async("string")
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
      let assetData: string | undefined
      try {
        assetData = isImageFile(file.name) ? await fileToDataUrl(file) : undefined
        if (!assetData) content = await file.text()
      } catch {
        content = ""
      }
      nodes.push({
        id: generateId(),
        name: file.name,
        type: "file",
        path: `/${file.name}`,
        content,
        assetData,
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
            newNode.assetData = isImageFile(file.name) ? await fileToDataUrl(file) : undefined
            if (!newNode.assetData) newNode.content = await file.text()
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
      const assetData = node.assetData
      if (assetData?.startsWith("data:")) {
        zip.file(prefix + node.name, assetData.slice(assetData.indexOf(",") + 1), { base64: true })
      } else {
        zip.file(prefix + node.name, node.content || "")
      }
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
