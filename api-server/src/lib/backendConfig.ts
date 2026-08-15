import { resolve } from "node:path"

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export const WORKSPACE_ROOT = resolve(process.env["WORKSPACE_ROOT"] || "./workspace-sessions")
export const RUNTIME_IMAGE = process.env["RUNTIME_IMAGE"] || "sk-coder-runtime:latest"
export const SESSION_TTL_HOURS = numberEnv("SESSION_TTL_HOURS", 72)
export const SESSION_MAX_BYTES = numberEnv("SESSION_MAX_BYTES", 5 * 1024 * 1024 * 1024)
export const WORKSPACE_MAX_BYTES = numberEnv("WORKSPACE_MAX_BYTES", 100 * 1024 * 1024 * 1024)
export const SESSION_MAX_COUNT = numberEnv("SESSION_MAX_COUNT", 50)
export const COMMAND_TIMEOUT_MS = numberEnv("COMMAND_TIMEOUT_MS", 120000)
