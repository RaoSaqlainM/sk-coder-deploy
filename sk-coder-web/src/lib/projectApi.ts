import type { FileNode } from "../types/ide"

const BASE = import.meta.env.VITE_API_URL || "/api"

function getDeviceId(): string {
  let id = localStorage.getItem("sk-device-id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("sk-device-id", id)
  }
  return id
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getDeviceId(),
  }
}

export async function createProject(name = "Workspace") {
  const res = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error("Failed to create project")
  return res.json() as Promise<{ id: string; name: string; files: FileNode[] }>
}

export async function listProjects() {
  const res = await fetch(`${BASE}/projects`, { headers: getHeaders() })
  if (!res.ok) throw new Error("Failed to list projects")
  return res.json() as Promise<Array<{ id: string; name: string; files: FileNode[] }>>
}

export async function loadProject(id: string) {
  const res = await fetch(`${BASE}/projects/${id}`, { headers: getHeaders() })
  if (!res.ok) throw new Error("Failed to load project")
  return res.json() as Promise<{ id: string; name: string; files: FileNode[] }>
}

export async function saveProject(id: string, fileTree: FileNode[]) {
  const res = await fetch(`${BASE}/projects/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ files: fileTree }),
  })
  if (!res.ok) throw new Error("Failed to save project")
  return res.json() as Promise<{ id: string; name: string; files: FileNode[] }>
}
