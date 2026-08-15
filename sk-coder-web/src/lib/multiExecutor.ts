import { execute, type ExecutionTier } from "./executorChain"

interface ExecutorResult {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  executor: ExecutionTier
  capability: string
}

export async function executeCode(language: string, code: string): Promise<ExecutorResult> {
  const result = await execute(language, code)
  return { ...result, executor: result.tier }
}
