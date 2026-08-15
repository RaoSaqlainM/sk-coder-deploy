import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const DATA_DIR = path.join(process.cwd(), "backend_data");

function loadProjectContext(projectId: string, deviceId: string, selectedPaths: string[] = []) {
  if (!projectId) return "";
  const p = path.join(DATA_DIR, `${projectId}.json`);
  if (!fs.existsSync(p)) return "";
  const data = JSON.parse(fs.readFileSync(p, "utf-8"));
  if (data.deviceId !== deviceId) return "";
  const files = (data.files || []).filter((file: any) => selectedPaths.includes(file.path));
  if (!files.length) return "";
  return files.map((file: any) => `File: ${file.path}\n\n${String(file.content || "").slice(0, 4000)}`).join("\n\n---\n\n");
}

router.post("/ai/chat", async (req: any, res) => {
  const { apiKey, provider, prompt, messages, systemPrompt, projectId, selectedPaths, model, endpoint } = req.body;
  const userPrompt = typeof prompt === "string" ? prompt : (messages?.[messages.length - 1]?.content || "");
  if (!apiKey || !userPrompt) return res.status(400).json({ error: "apiKey and prompt required" });

  const apiEndpoint = provider === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : (endpoint || "https://api.openai.com/v1/chat/completions");

  let enrichedPrompt = userPrompt;
  const context = loadProjectContext(projectId, req.deviceId, selectedPaths || []);
  if (context) {
    enrichedPrompt = `${userPrompt}\n\nWorkspace context:\n${context}`;
  }

  try {
    const r = await fetch(apiEndpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt || "You are SK Coder AI assistant. Help users write, debug, and improve their code." },
          { role: "user", content: enrichedPrompt },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });
    const j = await r.json() as any;
    const content = j?.choices?.[0]?.message?.content || j?.content || j?.message?.content || "";
    if (!content && j?.error) return res.status(400).json({ error: j.error.message || "AI API error" });
    res.json({ content });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
