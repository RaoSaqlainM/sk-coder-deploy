import { useRef, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useIDEStore } from "@/store/ideStore"
import { sendAIMessage, buildSystemPrompt } from "@/lib/aiClient"
import { actionLabel, buildAgentInstruction, extractAgentProposal, type AgentAction } from "@/lib/aiAgent"
import type { AIChatMessage } from "@/types/ide"

declare global {
  interface Window {
    puter?: {
      auth: { signIn: () => Promise<void>; isSignedIn: () => boolean }
      ai: {
        chat: (msgs: { role: string; content: string }[] | string, opts?: { model?: string }) => Promise<{ message: { content: Array<{ text: string }> } }>
      }
    }
  }
}

function getAllPaths(nodes: ReturnType<typeof useIDEStore.getState>["fileTree"]): string[] {
  const paths: string[] = []
  function walk(ns: typeof nodes) {
    for (const n of ns) {
      paths.push(n.path)
      if (n.children) walk(n.children)
    }
  }
  walk(nodes)
  return paths
}

async function ensurePuter(): Promise<boolean> {
  if (window.puter) return true
  return new Promise((resolve) => {
    const s = document.createElement("script")
    s.src = "https://js.puter.com/v2/"
    s.onload = () => setTimeout(() => resolve(!!window.puter), 300)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

async function sendViaPuter(prompt: string): Promise<string> {
  const ok = await ensurePuter()
  if (!ok) return "Puter.js failed to load. Check your internet connection."
  try {
    if (!window.puter!.auth.isSignedIn()) await window.puter!.auth.signIn()
    const resp = await window.puter!.ai.chat(prompt) as unknown
    const raw = resp as { message?: { content?: unknown } }
    const c = raw?.message?.content
    const text = typeof c === "string" ? c
      : Array.isArray(c) ? ((c[0] as { text?: string })?.text ?? String(c[0] ?? ""))
      : typeof resp === "string" ? (resp as string)
      : String(c ?? "")
    return text.trim() || "SK-AI returned an empty response. Try rephrasing your question."
  } catch (e) {
    return `Puter AI error: ${String(e)}`
  }
}

export default function AIChatPanel() {
  const {
    aiChatMessages, aiTyping, settings, addAIChatMessage, clearAIChat,
    setAITyping, setShowSettings, setSettingsTab, getActiveFile, fileTree, addFile, updateFileContent, deleteNode, setTerminalBridgeCmd, setActivePanel,
  } = useIDEStore()
  const [input, setInput] = useState("")
  const [proposals, setProposals] = useState<AgentAction[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeFile = getActiveFile()
  const { apiKey, keyStatus, usePuter } = settings.ai
  const noKey = !usePuter && !apiKey

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [aiChatMessages, aiTyping])

  function deliverAIReply(reply: string) {
    const { explanation, actions } = extractAgentProposal(reply)
    addAIChatMessage({ role: "assistant", content: explanation || (actions.length ? "I prepared actions for your review." : reply) })
    if (actions.length) setProposals((previous) => [...previous, ...actions])
  }

  function removeProposal(id: string) {
    setProposals((previous) => previous.filter((proposal) => proposal.id !== id))
  }

  function approveProposal(action: AgentAction) {
    if (action.type === "write") {
      const exists = getAllPaths(fileTree).includes(action.path)
      if (exists) updateFileContent(action.path, action.content)
      else {
        const separator = action.path.lastIndexOf("/")
        const parent = separator <= 0 ? "/" : action.path.slice(0, separator)
        const name = action.path.slice(separator + 1)
        addFile(parent, name, "file", action.content)
      }
    } else if (action.type === "create_folder") {
      const separator = action.path.lastIndexOf("/")
      addFile(separator <= 0 ? "/" : action.path.slice(0, separator), action.path.slice(separator + 1), "folder")
    } else if (action.type === "delete") {
      deleteNode(action.path)
    } else if (action.type === "run") {
      setTerminalBridgeCmd({ cmd: action.command, targetType: "shell" })
    } else if (action.type === "preview") {
      setActivePanel("preview")
    }
    removeProposal(action.id)
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || aiTyping) return
    if (noKey) {
      setSettingsTab("ai")
      setShowSettings(true)
      return
    }

    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    addAIChatMessage({ role: "user", content: trimmed })
    setAITyping(true)

    try {
      if (usePuter) {
        const systemPrompt = `${buildSystemPrompt({
          activeFilePath: activeFile?.path,
          activeFileContent: settings.ai.autoContext ? activeFile?.content : undefined,
          fileTree: getAllPaths(fileTree),
        })}\n\n${buildAgentInstruction()}`
        const fullPrompt = `${systemPrompt}\n\nUser: ${trimmed}`
        const reply = await sendViaPuter(fullPrompt)
        deliverAIReply(reply)
      } else {
        const systemPrompt = `${buildSystemPrompt({
          activeFilePath: activeFile?.path,
          activeFileContent: settings.ai.autoContext ? activeFile?.content : undefined,
          fileTree: getAllPaths(fileTree),
        })}\n\n${buildAgentInstruction()}`

        const messages: AIChatMessage[] = [
          ...aiChatMessages,
          { id: "pending", role: "user", content: trimmed, timestamp: Date.now() },
        ]

        const res = await sendAIMessage({
          key: apiKey,
          customEndpoint: settings.ai.apiEndpoint,
          customModel: settings.ai.model,
          messages,
          systemPrompt,
        })

        if (res.error === "invalid_key") {
          addAIChatMessage({ role: "assistant", content: "Your API key appears invalid. Go to **Settings → SK-AI** and update your key." })
        } else if (res.error === "expired") {
          addAIChatMessage({ role: "assistant", content: "Your API usage limit has been reached. Please check your account." })
        } else if (res.error === "network_error") {
          addAIChatMessage({ role: "assistant", content: "Could not connect to the AI service. Check your internet connection." })
        } else if (res.error) {
          addAIChatMessage({ role: "assistant", content: `Something went wrong: ${res.error}` })
        } else {
          deliverAIReply(res.content)
        }
      }
    } catch (e) {
      addAIChatMessage({ role: "assistant", content: `Error: ${String(e)}` })
    } finally {
      setAITyping(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px"
  }

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", background: "rgba(167,139,250,0.16)", color: "#a78bfa", flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M9 9h.01M15 9h.01M9 15h6" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 13 }}>SK-AI</span>
          {usePuter && (
            <span className="badge badge-green" style={{ fontSize: 9 }}>Free via Puter</span>
          )}
          {!usePuter && keyStatus === "valid" && (
            <span className="badge badge-green" style={{ fontSize: 9 }}>Active</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="btn-icon"
            onClick={() => { setSettingsTab("ai"); setShowSettings(true) }}
            title="SK-AI Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button
            className="btn-icon"
            onClick={clearAIChat}
            title="Clear chat"
            disabled={aiChatMessages.length === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>

      {proposals.length > 0 && (
        <div style={{ margin: "0.75rem", display: "grid", gap: 8 }}>
          {proposals.map((proposal) => (
            <div key={proposal.id} style={{ padding: "0.75rem", borderRadius: 10, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.28)", display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{actionLabel(proposal)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>This action has not been applied.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" style={{ fontSize: 11, padding: "0.42rem 0.7rem" }} onClick={() => approveProposal(proposal)}>Approve</button>
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: "0.42rem 0.7rem" }} onClick={() => removeProposal(proposal.id)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {noKey && (
        <div
          className="ai-no-key-notice"
          onClick={() => { setSettingsTab("ai"); setShowSettings(true) }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Add your API key to start</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            Works with Gemini, OpenAI, Groq, Anthropic, OpenRouter — or enable Free SK-AI via Puter →
          </div>
        </div>
      )}

      <div className="ai-chat-messages">
        {aiChatMessages.length === 0 && !noKey && (
          <div className="panel-placeholder" style={{ padding: "2rem 1rem" }}>
            <div style={{ margin: "0 auto 0.75rem", width: 56, height: 56, borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(167,139,250,0.14)", boxShadow: "0 0 16px rgba(0,122,204,0.25)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M9 9h.01M15 9h.01M9 15h6" />
              </svg>
            </div>
            <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>SK Coder AI ready</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 220, textAlign: "center" }}>
              {usePuter ? "Powered by Free Puter AI — no API key needed." : "Ask about your code — bugs, explanations, new features, anything."}
            </p>
            {["Explain this file", "Fix the bug in my code", "Write a function to..."].map((s) => (
              <button
                key={s}
                className="btn btn-ghost"
                style={{ fontSize: 11, marginTop: "0.25rem", width: "100%", maxWidth: 240 }}
                onClick={() => { setInput(s); textareaRef.current?.focus() }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {aiChatMessages.map((msg) => (
          <div key={msg.id} className={`ai-chat-message ${msg.role}`}>
            <div className={`ai-chat-avatar ${msg.role}`}>
              {msg.role === "user" ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <path d="M9 9h.01M15 9h.01M9 15h6" />
                </svg>
              )}
            </div>
            <div className="ai-chat-bubble">
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ children, className }) {
                      const isBlock = className?.includes("language-")
                      return isBlock ? (
                        <pre><code className={className}>{children}</code></pre>
                      ) : (
                        <code>{children}</code>
                      )
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {aiTyping && (
          <div className="ai-chat-message assistant">
            <div className="ai-chat-avatar assistant">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M9 9h.01M15 9h.01M9 15h6" />
              </svg>
            </div>
            <div className="ai-chat-bubble">
              <div className="ai-typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-area">
        {activeFile && settings.ai.autoContext && (
          <div className="ai-chat-context-tag">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            {activeFile.name} in context
          </div>
        )}
        <div className="ai-chat-input-row">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={noKey ? "Add API key or enable Free SK-AI in Settings..." : "Ask SK-AI anything... (Enter to send)"}
            disabled={aiTyping}
            rows={1}
          />
          <button
            className="ai-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || aiTyping}
            title="Send (Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
