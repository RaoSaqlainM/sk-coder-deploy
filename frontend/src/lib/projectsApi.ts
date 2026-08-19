import type { FileNode } from "@/types/ide";
const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export interface CloudProject {
    id: number;
    name: string;
    description: string | null;
    language: string;
    files: FileNode[];
    createdAt: string;
    updatedAt: string;
}
export async function listProjects(): Promise<CloudProject[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok)
        throw new Error(`Failed to list projects: ${res.status}`);
    return res.json();
}
export async function saveProject(data: {
    name: string;
    description?: string;
    language: string;
    files: FileNode[];
}): Promise<CloudProject> {
    const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok)
        throw new Error(`Failed to save project: ${res.status}`);
    return res.json();
}
export async function updateProject(id: number, data: {
    name?: string;
    description?: string;
    language?: string;
    files?: FileNode[];
}): Promise<CloudProject> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok)
        throw new Error(`Failed to update project: ${res.status}`);
    return res.json();
}
export async function deleteProject(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
    if (!res.ok)
        throw new Error(`Failed to delete project: ${res.status}`);
}
export function detectLanguage(files: FileNode[]): string {
    const allFiles: FileNode[] = [];
    const flatten = (nodes: FileNode[]) => {
        for (const n of nodes) {
            if (n.type === "file")
                allFiles.push(n);
            if (n.children)
                flatten(n.children);
        }
    };
    flatten(files);
    const exts = allFiles.map((f) => f.name.split(".").pop()?.toLowerCase() || "");
    if (exts.includes("py"))
        return "python";
    if (exts.includes("ts") || exts.includes("tsx"))
        return "typescript";
    if (exts.includes("js") || exts.includes("jsx"))
        return "javascript";
    if (exts.includes("html"))
        return "html";
    if (exts.includes("css"))
        return "css";
    if (exts.includes("rs"))
        return "rust";
    if (exts.includes("go"))
        return "go";
    if (exts.includes("cpp") || exts.includes("c"))
        return "cpp";
    if (exts.includes("java"))
        return "java";
    return "text";
}
