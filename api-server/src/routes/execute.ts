import { Router } from "express";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const router = Router();
const TMP_DIR = path.join(process.cwd(), "tmp_exec");

function ensureDir(target: string) {
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
}

let _dockerAvailable: boolean | null = null;
function isDockerAvailable(): boolean {
  if (_dockerAvailable !== null) return _dockerAvailable;
  try {
    execSync("docker info --format '{{.ServerVersion}}'", { timeout: 5000, stdio: "ignore" });
    _dockerAvailable = true;
  } catch {
    _dockerAvailable = false;
  }
  return _dockerAvailable;
}

const DOCKER_IMAGES: Record<string, string> = {
  node: "node:20-alpine",
  javascript: "node:20-alpine",
  js: "node:20-alpine",
  python: "python:3.12-alpine",
  python3: "python:3.12-alpine",
  py: "python:3.12-alpine",
  java: "openjdk:21-slim",
  cpp: "gcc:latest",
  c: "gcc:latest",
  bash: "bash:5-alpine",
  sh: "bash:5-alpine",
  go: "golang:1.22-alpine",
  ruby: "ruby:3.3-alpine",
  rb: "ruby:3.3-alpine",
  php: "php:8.3-cli-alpine",
  rust: "rust:1.78-alpine",
  rs: "rust:1.78-alpine",
};

const DOCKER_RUN_CMDS: Record<string, (file: string) => string[]> = {
  node: (f) => ["node", f],
  javascript: (f) => ["node", f],
  js: (f) => ["node", f],
  python: (f) => ["python3", f],
  python3: (f) => ["python3", f],
  py: (f) => ["python3", f],
  bash: (f) => ["bash", f],
  sh: (f) => ["bash", f],
  go: (f) => ["go", "run", f],
  ruby: (f) => ["ruby", f],
  rb: (f) => ["ruby", f],
  php: (f) => ["php", f],
};

function resolveRuntime(language: string) {
  const lang = String(language || "").toLowerCase();
  if (["node", "nodejs", "javascript", "js"].includes(lang)) return { command: "node", args: [] };
  if (["python", "py", "python3"].includes(lang)) return { command: "python3", args: [] };
  if (["php"].includes(lang)) return { command: "php", args: [] };
  if (["ruby", "rb"].includes(lang)) return { command: "ruby", args: [] };
  if (["bash", "sh", "shell"].includes(lang)) return { command: "bash", args: [] };
  if (["go"].includes(lang)) return { command: "go", args: ["run"] };
  if (["rust", "rs"].includes(lang)) return { command: "rustc", args: [] };
  if (["cpp", "cc", "cxx"].includes(lang)) return { command: "g++", args: [] };
  if (["c"].includes(lang)) return { command: "gcc", args: [] };
  if (["java"].includes(lang)) return { command: "javac", args: [] };
  return null;
}

function runProcess(command: string, args: string[], cwd: string, timeout = 30000) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
    const proc = spawn(command, args, { cwd });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ stdout, stderr: `${stderr}\nTimeout after ${timeout}ms`, exitCode: 124 });
    }, timeout);
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code }); });
    proc.on("error", (error) => { clearTimeout(timer); resolve({ stdout, stderr: `${stderr}${error.message}`.trim(), exitCode: 1 }); });
  });
}

function runInDocker(image: string, runArgs: string[], filePath: string, timeout = 30000) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
    const fileName = path.basename(filePath);
    const dockerArgs = [
      "run", "--rm",
      "--memory=256m",
      "--cpus=0.5",
      "--network=none",
      "--pids-limit=64",
      "--read-only",
      "--tmpfs=/tmp:size=64m",
      "-v", `${filePath}:/workspace/${fileName}:ro`,
      "-w", "/workspace",
      image,
      ...runArgs.map((a) => a === filePath ? `/workspace/${fileName}` : a),
    ];
    const proc = spawn("docker", dockerArgs);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ stdout, stderr: `${stderr}\nTimeout after ${timeout}ms`, exitCode: 124 });
    }, timeout);
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code }); });
    proc.on("error", (error) => { clearTimeout(timer); resolve({ stdout, stderr: `${stderr}${error.message}`, exitCode: 1 }); });
  });
}

function buildOutputName(filePath: string, language: string) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, ext);
  if (["cpp", "cc", "cxx", "c", "rust", "rs"].includes(language)) return `${base}.out`;
  return base;
}

router.get("/execute/runtimes", (_req, res) => {
  const dockerOk = isDockerAvailable();
  res.json({
    runtimes: [
      { name: "node", available: dockerOk },
      { name: "python", available: dockerOk },
      { name: "java", available: dockerOk },
      { name: "cpp", available: dockerOk },
      { name: "c", available: dockerOk },
      { name: "php", available: dockerOk },
      { name: "ruby", available: dockerOk },
      { name: "go", available: dockerOk },
      { name: "rust", available: dockerOk },
      { name: "bash", available: dockerOk },
    ],
    dockerAvailable: dockerOk,
  });
});

router.post("/execute", async (req, res) => {
  const { language, code, fileName } = req.body;
  if (!code) return res.status(400).json({ error: "code is required" });

  if (!isDockerAvailable()) {
    return res.status(503).json({
      error: "Docker not available on this server — using Piston/Wandbox fallback",
      fallback: true,
    });
  }

  ensureDir(TMP_DIR);
  const ext = String(language || "txt").toLowerCase();
  const tempFile = path.join(TMP_DIR, fileName || `tmp-${Date.now()}.${ext}`);
  fs.writeFileSync(tempFile, String(code));

  const lang = String(language || "").toLowerCase();
  const image = DOCKER_IMAGES[lang];
  if (!image) return res.status(400).json({ error: `unsupported language: ${language}` });

  const start = Date.now();

  if (lang === "java") {
    const className = String(code).match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1] || "Main";
    const javaFile = path.join(TMP_DIR, `${className}.java`);
    fs.writeFileSync(javaFile, String(code));
    const compileArgs = [
      "run", "--rm",
      "--memory=256m", "--cpus=0.5", "--network=none", "--pids-limit=64",
      "--read-only", "--tmpfs=/tmp:size=64m",
      "-v", `${javaFile}:/workspace/${className}.java:ro`,
      "-w", "/workspace",
      image, "sh", "-c",
      `javac ${className}.java 2>&1 && java ${className} 2>&1`,
    ];
    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
      const proc = spawn("docker", compileArgs);
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => { proc.kill("SIGKILL"); resolve({ stdout, stderr: "Timeout", exitCode: 124 }); }, 30000);
      proc.stdout.on("data", (c) => { stdout += c.toString(); });
      proc.stderr.on("data", (c) => { stderr += c.toString(); });
      proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code }); });
      proc.on("error", (e) => { clearTimeout(timer); resolve({ stdout: "", stderr: e.message, exitCode: 1 }); });
    });
    fs.unlink(javaFile, () => {});
    return res.json({ stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, executionTime: Date.now() - start });
  }

  if (["cpp", "cc", "cxx", "c"].includes(lang)) {
    const compiler = lang === "c" ? "gcc" : "g++";
    const outName = buildOutputName(tempFile, lang);
    const compileArgs = [
      "run", "--rm",
      "--memory=256m", "--cpus=0.5", "--network=none", "--pids-limit=64",
      "--read-only", "--tmpfs=/tmp:size=64m",
      "-v", `${tempFile}:/workspace/main.${lang.replace("cxx", "cpp").replace("cc", "cpp")}:ro`,
      "-w", "/tmp",
      DOCKER_IMAGES["cpp"], "sh", "-c",
      `${compiler} /workspace/main.${lang.replace("cxx", "cpp").replace("cc", "cpp")} -o /tmp/${outName} 2>&1 && /tmp/${outName}`,
    ];
    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
      const proc = spawn("docker", compileArgs);
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => { proc.kill("SIGKILL"); resolve({ stdout, stderr: "Timeout", exitCode: 124 }); }, 30000);
      proc.stdout.on("data", (c) => { stdout += c.toString(); });
      proc.stderr.on("data", (c) => { stderr += c.toString(); });
      proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code }); });
      proc.on("error", (e) => { clearTimeout(timer); resolve({ stdout: "", stderr: e.message, exitCode: 1 }); });
    });
    fs.unlink(tempFile, () => {});
    return res.json({ stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, executionTime: Date.now() - start });
  }

  if (["rust", "rs"].includes(lang)) {
    const compileArgs = [
      "run", "--rm",
      "--memory=512m", "--cpus=0.5", "--network=none", "--pids-limit=64",
      "--tmpfs=/tmp:size=128m",
      "-v", `${tempFile}:/workspace/main.rs:ro`,
      "-w", "/tmp",
      DOCKER_IMAGES["rust"], "sh", "-c",
      "rustc /workspace/main.rs -o /tmp/main 2>&1 && /tmp/main",
    ];
    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
      const proc = spawn("docker", compileArgs);
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => { proc.kill("SIGKILL"); resolve({ stdout, stderr: "Timeout", exitCode: 124 }); }, 60000);
      proc.stdout.on("data", (c) => { stdout += c.toString(); });
      proc.stderr.on("data", (c) => { stderr += c.toString(); });
      proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code }); });
      proc.on("error", (e) => { clearTimeout(timer); resolve({ stdout: "", stderr: e.message, exitCode: 1 }); });
    });
    fs.unlink(tempFile, () => {});
    return res.json({ stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, executionTime: Date.now() - start });
  }

  const runCmd = DOCKER_RUN_CMDS[lang];
  if (!runCmd) {
    fs.unlink(tempFile, () => {});
    return res.status(400).json({ error: `unsupported language: ${language}` });
  }

  const fileName2 = path.basename(tempFile);
  const result = await runInDocker(image, runCmd(`/workspace/${fileName2}`), tempFile, 30000);
  fs.unlink(tempFile, () => {});
  return res.json({ stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, executionTime: Date.now() - start });
});

const NPM_ALLOWLIST = /^(install|install\s+[\w@/.-]+|run\s+\w[\w.-]*|start)$/

router.post("/execute/npm", async (req, res) => {
  const { projectId, command } = req.body as { projectId?: string; command?: string }
  if (!command || !NPM_ALLOWLIST.test(String(command).trim())) {
    return res.status(400).json({ error: "npm command not allowed. Permitted: install, install <pkg>, run <script>, start" })
  }
  const projectDir = path.join(TMP_DIR, `npm-${String(projectId || "default").replace(/[^a-z0-9-]/gi, "_")}`)
  ensureDir(projectDir)
  const start = Date.now()
  const proc = spawn("npm", command.trim().split(/\s+/), { cwd: projectDir })
  let stdout = ""
  let stderr = ""
  const timer = setTimeout(() => { proc.kill("SIGKILL") }, 60000)
  proc.stdout.on("data", (c) => { stdout += c.toString() })
  proc.stderr.on("data", (c) => { stderr += c.toString() })
  proc.on("close", (exitCode) => {
    clearTimeout(timer)
    res.json({ stdout, stderr, exitCode, executionTime: Date.now() - start })
  })
  proc.on("error", (e) => {
    clearTimeout(timer)
    res.json({ stdout, stderr: e.message, exitCode: 1, executionTime: Date.now() - start })
  })
})

export default router;
