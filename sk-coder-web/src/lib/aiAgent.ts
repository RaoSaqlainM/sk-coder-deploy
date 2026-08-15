export type AgentAction =
  | { id: string; type: "write"; path: string; content: string }
  | { id: string; type: "create_folder"; path: string }
  | { id: string; type: "delete"; path: string }
  | { id: string; type: "run"; command: string }
  | { id: string; type: "preview"; path?: string }

type RawAction = { type?: unknown; path?: unknown; content?: unknown; command?: unknown }

function safePath(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 240) return false
  const path = value.trim()
  return path.startsWith("/") && !path.includes("\0") && !path.split("/").includes("..")
}

function safeCommand(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 2000 && !value.includes("\0")
}

export function buildAgentInstruction() {
  return "When a workspace action is needed, return a short explanation followed by one <sk-actions> JSON array. Supported actions are write {type,path,content}, create_folder {type,path}, delete {type,path}, run {type,command}, and preview {type,path}. Use absolute workspace paths. Do not claim that actions have already been executed; each proposal requires user approval."
}

export function extractAgentProposal(reply: string) {
  const match = reply.match(/<sk-actions>\s*([\s\S]*?)\s*<\/sk-actions>/i)
  if (!match) return { explanation: reply.trim(), actions: [] as AgentAction[] }
  const explanation = reply.replace(match[0], "").trim()
  try {
    const raw = JSON.parse(match[1]) as unknown
    if (!Array.isArray(raw)) return { explanation, actions: [] as AgentAction[] }
    const actions: AgentAction[] = []
    raw.slice(0, 12).forEach((value, index) => {
      const action = value as RawAction
      const id = `${Date.now().toString(36)}-${index}`
      if (action.type === "write" && safePath(action.path) && typeof action.content === "string" && action.content.length <= 2_000_000) actions.push({ id, type: "write", path: action.path, content: action.content })
      else if (action.type === "create_folder" && safePath(action.path)) actions.push({ id, type: "create_folder", path: action.path })
      else if (action.type === "delete" && safePath(action.path)) actions.push({ id, type: "delete", path: action.path })
      else if (action.type === "run" && safeCommand(action.command)) actions.push({ id, type: "run", command: action.command })
      else if (action.type === "preview" && (action.path === undefined || safePath(action.path))) actions.push(typeof action.path === "string" ? { id, type: "preview", path: action.path } : { id, type: "preview" })
    })
    return { explanation, actions }
  } catch {
    return { explanation, actions: [] as AgentAction[] }
  }
}

export function actionLabel(action: AgentAction) {
  if (action.type === "write") return `Write ${action.path}`
  if (action.type === "create_folder") return `Create folder ${action.path}`
  if (action.type === "delete") return `Delete ${action.path}`
  if (action.type === "run") return `Run ${action.command}`
  return `Open ${action.path || "workspace"} in Preview`
}
