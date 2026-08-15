import { runNodeJS, isNodeboxLoaded } from "./nodebox";
import { runPython, isPyodideLoaded } from "./pyodideRunner";

export interface ExecResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

const PISTON_URL = "https://emkc.org/api/v2/piston";
const WANDBOX_URL = "https://wandbox.org/api/compile.json";

interface LangConfig {
  piston: string;
  wandbox?: string;
}

const LANGUAGE_MAP: Record<string, LangConfig> = {
  js: { piston: "javascript", wandbox: "nodejs-head" },
  jsx: { piston: "javascript" },
  ts: { piston: "typescript" },
  tsx: { piston: "typescript" },
  py: { piston: "python3", wandbox: "cpython-head" },
  python: { piston: "python3", wandbox: "cpython-head" },
  cpp: { piston: "cpp", wandbox: "gcc-head" },
  c: { piston: "c", wandbox: "gcc-head" },
  java: { piston: "java", wandbox: "openjdk-head" },
  kt: { piston: "kotlin", wandbox: "kotlin-head" },
  rs: { piston: "rust", wandbox: "rust-head" },
  go: { piston: "go", wandbox: "go-head" },
  rb: { piston: "ruby", wandbox: "ruby-head" },
  php: { piston: "php", wandbox: "php-head" },
  bash: { piston: "bash", wandbox: "bash" },
  sh: { piston: "bash", wandbox: "bash" },
};

async function tryPiston(lang: string, code: string): Promise<ExecResponse | null> {
  try {
    const config = LANGUAGE_MAP[lang.toLowerCase()];
    if (!config) return null;

    const res = await fetch(`${PISTON_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: config.piston,
        version: "*",
        files: [{ name: "main", content: code }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const run = data.run || {};

    return {
      stdout: run.stdout || "",
      stderr: run.stderr || "",
      exitCode: run.code ?? 0,
      executionTime: run.time ? Math.round(parseFloat(run.time) * 1000) : 0,
    };
  } catch {
    return null;
  }
}

async function tryWandbox(lang: string, code: string): Promise<ExecResponse | null> {
  try {
    const config = LANGUAGE_MAP[lang.toLowerCase()];
    if (!config?.wandbox) return null;

    const res = await fetch(WANDBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: config.wandbox,
        code,
        filename: `main.${lang}`,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;

    const stdout = data.program_output || data.compiler_output || "";
    const stderr = data.program_error || data.compiler_error || "";

    return {
      stdout,
      stderr,
      exitCode: stderr ? 1 : 0,
      executionTime: 0,
    };
  } catch {
    return null;
  }
}

async function tryPyodide(code: string): Promise<ExecResponse | null> {
  try {
    const { output, error } = await runPython(code);
    return {
      stdout: output,
      stderr: error,
      exitCode: error ? 1 : 0,
      executionTime: 0,
    };
  } catch {
    return null;
  }
}

async function tryNodebox(code: string): Promise<ExecResponse | null> {
  try {
    const { output, error } = await runNodeJS(code);
    return {
      stdout: output,
      stderr: error,
      exitCode: error ? 1 : 0,
      executionTime: 0,
    };
  } catch {
    return null;
  }
}

async function tryBackend(lang: string, code: string): Promise<ExecResponse | null> {
  try {
    const deviceId = localStorage.getItem("sk-device-id") || "anonymous";
    const res = await fetch("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": deviceId,
      },
      body: JSON.stringify({ language: lang, code }),
      signal: AbortSignal.timeout(35000),
    });

    if (res.status === 503 || !res.ok) return null;
    const data = (await res.json()) as any;
    if (data.error) return null;
    return {
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      exitCode: data.exitCode || 0,
      executionTime: data.executionTime || 0,
    };
  } catch {
    return null;
  }
}

export async function execute(lang: string, code: string): Promise<ExecResponse> {
  const l = lang.toLowerCase();
  const start = Date.now();

  if (l === "python" || l === "py") {
    const backend = await tryBackend("python", code);
    if (backend) return backend;
    const pyodide = await tryPyodide(code);
    if (pyodide) return pyodide;
    return { stdout: "", stderr: "Python execution failed", exitCode: 1, executionTime: Date.now() - start };
  }

  if (l === "javascript" || l === "js" || l === "node") {
    const backend = await tryBackend("node", code);
    if (backend) return backend;
    const nodebox = await tryNodebox(code);
    if (nodebox) return nodebox;
    return { stdout: "", stderr: "JavaScript execution failed", exitCode: 1, executionTime: Date.now() - start };
  }

  const piston = await tryPiston(l, code);
  if (piston) return piston;

  const wandbox = await tryWandbox(l, code);
  if (wandbox) return wandbox;

  return { stdout: "", stderr: `Language "${lang}" not supported`, exitCode: 1, executionTime: Date.now() - start };
}
