let nodebox: any = null;
let loading = false;

async function ensureNodebox(): Promise<any> {
  if (nodebox) return nodebox;
  if (loading) {
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (nodebox) {
          clearInterval(check);
          resolve(null);
        }
      }, 100);
    });
    return nodebox;
  }

  loading = true;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/nodebox@1.0.0/dist/nodebox.js";
    script.onload = () => {
      nodebox = (window as any).nodebox || (window as any).Nodebox;
      loading = false;
      resolve(nodebox);
    };
    script.onerror = () => {
      loading = false;
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

export async function runNodeJS(code: string): Promise<{ output: string; error: string }> {
  try {
    const nb = await ensureNodebox();
    if (!nb) return { output: "", error: "Node.js sandbox not available" };

    const output: string[] = [];
    const errors: string[] = [];

    const sandbox = {
      console: {
        log: (...args: any[]) => output.push(args.map(formatValue).join(" ")),
        error: (...args: any[]) => errors.push(args.map(formatValue).join(" ")),
        warn: (...args: any[]) => output.push("[warn] " + args.map(formatValue).join(" ")),
        info: (...args: any[]) => output.push("[info] " + args.map(formatValue).join(" ")),
      },
      require: (mod: string) => {
        const mocks: Record<string, any> = {
          path: {
            join: (...a: any[]) => a.join("/"),
            resolve: (...a: any[]) => "/" + a.join("/"),
            basename: (p: string) => p.split("/").pop(),
            extname: (p: string) => {
              const i = p.lastIndexOf(".");
              return i === -1 ? "" : p.slice(i);
            },
          },
          os: {
            platform: () => "linux",
            homedir: () => "/home/user",
            tmpdir: () => "/tmp",
          },
          fs: {
            existsSync: () => false,
            readFileSync: () => "",
            writeFileSync: () => {},
          },
          crypto: { randomUUID: () => Math.random().toString(36).slice(2) },
        };
        if (mocks[mod]) return mocks[mod];
        throw new Error(`Module "${mod}" not available in browser`);
      },
      process: {
        env: {},
        exit: (code: number) => {
          throw new Error(`process.exit(${code})`);
        },
      },
    };

    try {
      const fn = new Function("console", "require", "process", code);
      const result = fn(sandbox.console, sandbox.require, sandbox.process);
      if (result !== undefined) {
        output.push("→ " + formatValue(result));
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }

    return {
      output: output.join("\n"),
      error: errors.length > 0 ? errors.join("\n") : "",
    };
  } catch (e) {
    return { output: "", error: String(e) };
  }
}

function formatValue(v: any): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Error) return v.stack || v.message;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function isNodeboxLoaded(): boolean {
  return !!nodebox;
}
