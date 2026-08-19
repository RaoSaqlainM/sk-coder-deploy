import type { FileNode } from "@/types/ide"

export type FileCapability = "preview" | "run" | "none"

export type FolderCapability = {
  buildCommand?: string
  runCommand?: string
  label?: string
}

const SOURCE_EXTENSIONS = new Set([
  "js", "mjs", "cjs", "ts", "tsx", "py", "java", "kt", "kts", "c", "cc", "cpp", "cxx", "rs", "go", "php", "rb", "sh", "bash",
])

const HTML_EXTENSIONS = new Set(["html", "htm"])
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"])
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogv", "ogg", "mov"])
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "oga", "webm", "m4a", "aac", "flac"])

export function extensionFor(name: string) {
  const last = name.lastIndexOf(".")
  return last >= 0 ? name.slice(last + 1).toLowerCase() : ""
}

export function getFileCapability(node: FileNode): FileCapability {
  if (node.type !== "file") return "none"
  const extension = extensionFor(node.name)
  if (HTML_EXTENSIONS.has(extension) || isDirectPreviewFile(node)) return "preview"
  return SOURCE_EXTENSIONS.has(extension) ? "run" : "none"
}

export function isImagePreviewFile(node: FileNode): boolean {
  return node.type === "file" && IMAGE_EXTENSIONS.has(extensionFor(node.name))
}

export function isVideoPreviewFile(node: FileNode): boolean {
  return node.type === "file" && VIDEO_EXTENSIONS.has(extensionFor(node.name))
}

export function isAudioPreviewFile(node: FileNode): boolean {
  return node.type === "file" && AUDIO_EXTENSIONS.has(extensionFor(node.name))
}

export function isDirectPreviewFile(node: FileNode): boolean {
  return isImagePreviewFile(node) || isVideoPreviewFile(node) || isAudioPreviewFile(node)
}

export function previewLabelFor(node: FileNode): string {
  if (isImagePreviewFile(node)) return "Preview Image"
  if (isVideoPreviewFile(node)) return "Play Video"
  if (isAudioPreviewFile(node)) return "Play Audio"
  return "Preview Static Site"
}

function namesInFolder(folder: FileNode) {
  return new Set((folder.children ?? []).filter((node) => node.type === "file").map((node) => node.name.toLowerCase()))
}

export function getFolderCapability(folder: FileNode): FolderCapability {
  if (folder.type !== "folder") return {}
  const names = namesInFolder(folder)
  if (names.has("package.json")) return { label: "Node.js project", buildCommand: "npm run build", runCommand: "npm run dev" }
  if (names.has("cargo.toml")) return { label: "Rust project", buildCommand: "cargo build", runCommand: "cargo run" }
  if (names.has("go.mod")) return { label: "Go project", buildCommand: "go build ./...", runCommand: "go run ." }
  if (names.has("pom.xml")) return { label: "Java Maven project", buildCommand: "mvn package", runCommand: "mvn exec:java" }
  if (names.has("build.gradle") || names.has("build.gradle.kts")) return { label: "JVM Gradle project", buildCommand: "gradle build", runCommand: "gradle run" }
  if (names.has("cmakelists.txt")) return { label: "CMake project", buildCommand: "cmake -S . -B build && cmake --build build" }
  if (names.has("makefile")) return { label: "Make project", buildCommand: "make" }
  if (names.has("composer.json")) return { label: "PHP project", runCommand: "php -S 0.0.0.0:3000" }
  if (names.has("gemfile")) return { label: "Ruby project", runCommand: "bundle exec ruby main.rb" }
  if (names.has("requirements.txt") || names.has("pyproject.toml")) return { label: "Python project", runCommand: "python3 main.py" }
  return {}
}

export function folderCommand(folder: FileNode, command: string) {
  return `cd ${JSON.stringify(folder.path || "/")} && ${command}`
}
