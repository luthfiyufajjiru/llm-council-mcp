import { z } from "zod";

export const ReasoningEffortSchema = z.enum(["low", "medium", "high"]);
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

export const DeliberationInputSchema = z.object({
  problem: z.string().describe("The core engineering task, architectural question, or bug to solve."),
  context: z.string().optional().describe("Relevant context, requirements, file snippets, or constraints."),
  architectModel: z.string().optional().describe("Override model for the Architect (default: COUNCIL_ARCHITECT_MODEL or gpt-5.6-sol)"),
  contrarianModel: z.string().optional().describe("Override model for the Contrarian (default: COUNCIL_CONTRARIAN_MODEL or deepseek-v4-pro)"),
  architectEffort: ReasoningEffortSchema.optional().describe("Reasoning effort for the Architect: low | medium | high (default: medium)"),
  contrarianEffort: ReasoningEffortSchema.optional().describe("Reasoning effort for the Contrarian: low | medium | high (default: high)"),
});

export type DeliberationInput = z.infer<typeof DeliberationInputSchema>;

export const SingleConsultInputSchema = z.object({
  prompt: z.string().describe("The specific query, code block, or question to review."),
  context: z.string().optional().describe("Additional context or existing design."),
  model: z.string().optional().describe("Override model identifier."),
  effort: ReasoningEffortSchema.optional().describe("Reasoning effort level: low | medium | high."),
});

export type SingleConsultInput = z.infer<typeof SingleConsultInputSchema>;

export const TaskWorkerInputSchema = z.object({
  task: z.string().describe("The implementation subtask, utility function to write, unit tests to generate, or code refactor."),
  context: z.string().optional().describe("Background code, types, interfaces, or constraints."),
  provider: z.enum(["deepseek", "openai"]).optional().describe("Which provider to use (default: deepseek for flash speed, or openai for gpt-5.6-sol)."),
  model: z.string().optional().describe("Override model identifier (default: deepseek-v4-flash or gpt-5.6-sol)."),
  effort: ReasoningEffortSchema.optional().describe("Reasoning effort level if using reasoning model (default: low for fast worker offload)."),
});

export type TaskWorkerInput = z.infer<typeof TaskWorkerInputSchema>;

export const FastContextReaderInputSchema = z.object({
  content: z.string().describe("Large document, code snippet, log output, or cache to extract information from."),
  focus: z.string().describe("What to extract, summarize, or filter (e.g. 'all error traces', 'exported function signatures', 'summary of state changes')."),
  provider: z.enum(["deepseek", "openai"]).optional().describe("Which provider to use (default: deepseek)."),
  model: z.string().optional().describe("Override model identifier (default: deepseek-v4-flash)."),
});

export type FastContextReaderInput = z.infer<typeof FastContextReaderInputSchema>;

export interface CouncilMemberResult {
  role: string;
  model: string;
  effort: string;
  response: string;
  thinking?: string;
  durationMs: number;
  error?: string;
}

export interface DeliberationOutput {
  architect: CouncilMemberResult;
  contrarian: CouncilMemberResult;
  tensionPoints: string[];
}

export interface WorkerResult {
  provider: string;
  model: string;
  response: string;
  durationMs: number;
  error?: string;
}
