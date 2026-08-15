import { useState, useRef, useEffect } from "react"
import { ChevronRight } from "lucide-react"
import { useIDEStore } from "@/store/ideStore"
import { toast } from "sonner"

interface TerminalOption {
  id: string
  label: string
  description: string
  icon: string
  color: string
}

const TERMINAL_OPTIONS: TerminalOption[] = [
  {
    id: "bash",
    label: "Bash",
    description: "Linux shell commands",
    icon: "⌨️",
    color: "rgb(76, 175, 80)"
  },
  {
    id: "python",
    label: "Python",
    description: "Python 3.11+",
    icon: "🐍",
    color: "rgb(52, 152, 219)"
  },
  {
    id: "node",
    label: "Node.js",
    description: "JavaScript runtime",
    icon: "⚡",
    color: "rgb(200, 124, 88)"
  },
  {
    id: "ai",
    label: "SK AI",
    description: "AI Assistant",
    icon: "🤖",
    color: "rgb(155, 89, 182)"
  },
  {
    id: "output",
    label: "Output",
    description: "Execution results",
    icon: "📊",
    color: "rgb(230, 126, 34)"
  },
]

interface TerminalSelectorProps {
  onSelect?: (terminalId: string) => void
}

export default function TerminalSelector({ onSelect }: TerminalSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { setTerminalType, addNewTerminalTab } = useIDEStore()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (option: TerminalOption) => {
    addNewTerminalTab?.(option.id)
    setTerminalType?.(option.id)
    toast.success(`Opened ${option.label}`)
    setIsOpen(false)
    onSelect?.(option.id)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-surface hover:bg-surface/80 border border-border rounded transition-all text-sm font-500 text-foreground flex items-center gap-1"
        title="Open new terminal"
      >
        <span>+ Terminal</span>
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-72 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 bg-background/50 border-b border-border">
            <div className="text-xs font-600 text-muted uppercase tracking-wide">Select Terminal</div>
          </div>

          <div className="grid grid-cols-1 gap-0">
            {TERMINAL_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className="w-full px-4 py-3 hover:bg-background/50 border-b border-border last:border-b-0 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${option.color}20` }}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-500 text-foreground group-hover:text-accent transition-colors">
                      {option.label}
                    </div>
                    <div className="text-xs text-muted mt-0.5">{option.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="px-4 py-2 bg-background/30 border-t border-border text-xs text-muted">
            Click to open terminal session
          </div>
        </div>
      )}
    </div>
  )
}
