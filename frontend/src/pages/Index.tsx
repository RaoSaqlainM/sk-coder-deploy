import { useEffect } from "react";
import { Toaster } from "sonner";
import { useIDEStore } from "@/store/ideStore";
import TopBar from "@/components/ide/TopBar";
import BottomNav from "@/components/ide/BottomNav";
import FileExplorer from "@/components/ide/FileExplorer";
import EditorTabs from "@/components/ide/EditorTabs";
import CodeEditor from "@/components/ide/CodeEditor";
import MultiTerminal from "@/components/ide/Terminal";
import PreviewPane from "@/components/ide/PreviewPane";
import AIChatPanel from "@/components/ide/AIChatPanel";
import CloudShell from "@/components/ide/CloudShell";
import SettingsPanel from "@/components/ide/SettingsPanel";
import ContextMenu from "@/components/ide/ContextMenu";
import NewFileDialog from "@/components/ide/NewFileDialog";
import ApkEditor from "@/components/ide/ApkEditor";
import ErrorPanel from "@/components/ide/ErrorPanel";
export default function IndexPage() {
    const { activePanel, sidebarOpen, showSettings, setContextMenu, newItemType, loadWorkspaceFromBackend, saveWorkspaceToBackend } = useIDEStore();
    const combinedWorkspace = activePanel === "editor" && sidebarOpen;
    useEffect(() => {
        void loadWorkspaceFromBackend();
    }, [loadWorkspaceFromBackend]);
    useEffect(() => {
        const timer = window.setInterval(() => { void saveWorkspaceToBackend(); }, 10000);
        return () => window.clearInterval(timer);
    }, [saveWorkspaceToBackend]);
    return (<div className="ide-layout" onClick={() => setContextMenu(null)}>
      <TopBar />

      <div className={`ide-main${combinedWorkspace ? " workspace-combined" : ""}`}>
        <div className={`ide-sidebar${combinedWorkspace ? " sidebar-open" : ""}`}>
          <FileExplorer />
        </div>

        <div className="ide-center">
          {activePanel === "files" && (<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <FileExplorer />
            </div>)}
          <div className="ide-editor-area" style={{ display: activePanel === "editor" ? "flex" : "none", position: "relative" }}>
            <EditorTabs />
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <CodeEditor />
            </div>
            <ErrorPanel />
          </div>
          {activePanel === "terminal" && (<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <MultiTerminal />
            </div>)}
          {activePanel === "preview" && (<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <PreviewPane />
            </div>)}
          {activePanel === "ai" && (<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <AIChatPanel />
            </div>)}
          {activePanel === "cloud" && (<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <CloudShell />
            </div>)}
          {activePanel === "apk" && (<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <ApkEditor />
            </div>)}
        </div>
      </div>

      <BottomNav />

      {showSettings && <SettingsPanel />}
      {newItemType && <NewFileDialog />}
      <ContextMenu />

      <Toaster position="top-right" theme="dark" toastOptions={{
            style: {
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
            },
        }}/>
    </div>);
}
