declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<any>;
    _pyodide?: any;
  }
}

let pyodideInstance: any = null;
let loading = false;
let loadPromise: Promise<any> | null = null;

async function ensurePyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  if (loadPromise) return loadPromise;

  loading = true;
  loadPromise = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(script);
      });
    }
    const py = await window.loadPyodide!({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
    pyodideInstance = py;
    loading = false;
    return py;
  })();

  return loadPromise;
}

export async function runPython(
  code: string,
  onOutput?: (text: string, type: "output" | "error") => void
): Promise<{ output: string; error: string }> {
  const outputs: string[] = [];
  const errors: string[] = [];

  try {
    const py = await ensurePyodide();

    py.setStdout({ batched: (text: string) => {
      outputs.push(text);
      onOutput?.(text, "output");
    }});
    py.setStderr({ batched: (text: string) => {
      errors.push(text);
      onOutput?.(text, "error");
    }});

    await py.runPythonAsync(code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    onOutput?.(msg, "error");
  }

  return {
    output: outputs.join(""),
    error: errors.join(""),
  };
}

export function isPyodideLoaded(): boolean {
  return !!pyodideInstance;
}

export function isPyodideLoading(): boolean {
  return loading;
}
