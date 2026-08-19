import { execute, type ExecutionTier } from "./executorChain";
export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    language: string;
    executor: ExecutionTier;
    capability: string;
    compiledCode?: string;
    isPreviewable: boolean;
    previewType: "html" | "text" | "code" | "json";
}
const SUPPORTED_EXTENSIONS = new Set(["js", "jsx", "mjs", "cjs", "ts", "tsx", "py", "python", "java", "c", "cpp", "cc", "kt", "kotlin", "rs", "rust", "go", "php", "rb", "ruby", "bash", "sh"]);
export async function unifiedExecute(language: string, code: string): Promise<ExecutionResult | null> {
    const ext = language.toLowerCase().split(".").pop() || language.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext))
        return null;
    const result = await execute(ext, code);
    return {
        ...result,
        language: ext,
        executor: result.tier,
        isPreviewable: false,
        previewType: "text",
    };
}
export function getFileExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || "";
}
export function isLanguageSupported(language: string): boolean {
    return SUPPORTED_EXTENSIONS.has(getFileExtension(language));
}
export function getLanguageLabel(ext: string): string {
    const labels: Record<string, string> = {
        js: "JavaScript", jsx: "JavaScript/React", mjs: "JavaScript", cjs: "JavaScript", ts: "TypeScript", tsx: "TypeScript/React", py: "Python", python: "Python", java: "Java", c: "C", cpp: "C++", cc: "C++", kt: "Kotlin", kotlin: "Kotlin", rs: "Rust", rust: "Rust", go: "Go", php: "PHP", rb: "Ruby", ruby: "Ruby", bash: "Bash", sh: "Shell",
    };
    return labels[ext.toLowerCase()] || ext.toUpperCase();
}
