import { resolve } from "node:path";
function numberEnv(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}
export const WORKSPACE_ROOT = resolve(process.env["WORKSPACE_ROOT"] || "./workspace-sessions");
export const WORKSPACE_METADATA_PATH = resolve(process.env["WORKSPACE_METADATA_PATH"] || `${WORKSPACE_ROOT}/.registry/workspaces.json`);
export const RUNTIME_IMAGE = process.env["RUNTIME_IMAGE"] || "sk-coder-runtime:latest";
export const SESSION_TTL_HOURS = numberEnv("SESSION_TTL_HOURS", 72);
export const SESSION_MAX_BYTES = numberEnv("SESSION_MAX_BYTES", 5 * 1024 * 1024 * 1024);
export const WORKSPACE_MAX_BYTES = numberEnv("WORKSPACE_MAX_BYTES", 50 * 1024 * 1024 * 1024);
export const RUNNER_SCRATCH_MAX_BYTES = numberEnv("RUNNER_SCRATCH_MAX_BYTES", 35 * 1024 * 1024 * 1024);
export const STAGING_MAX_BYTES = numberEnv("STAGING_MAX_BYTES", 15 * 1024 * 1024 * 1024);
export const RUNTIME_CACHE_MAX_BYTES = numberEnv("RUNTIME_CACHE_MAX_BYTES", 25 * 1024 * 1024 * 1024);
export const WORKSPACE_SAFETY_RESERVE_BYTES = numberEnv("WORKSPACE_SAFETY_RESERVE_BYTES", 25 * 1024 * 1024 * 1024);
export const PACKAGE_CACHE_MAX_BYTES = numberEnv("PACKAGE_CACHE_MAX_BYTES", 20 * 1024 * 1024 * 1024);
export const LOG_MAX_BYTES = numberEnv("LOG_MAX_BYTES", 5 * 1024 * 1024 * 1024);
export const SESSION_MAX_COUNT = numberEnv("SESSION_MAX_COUNT", 50);
export const COMMAND_TIMEOUT_MS = numberEnv("COMMAND_TIMEOUT_MS", 120000);
