import { z } from "zod";
import { BriefShape, hasConcreteCode } from "./brief.js";

export const ReasoningEffortSchema = z.enum(["low", "medium", "high"]);
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

export const DeliberationInputSchema = z
  .object({
    problem: z.string().describe("The core engineering task, architectural question, or bug to solve."),
    ...BriefShape,
    system_overview: z.string().min(1).describe(BriefShape.system_overview.description ?? "System overview (required)."),
    architectModel: z.string().optional().describe("Override model for the Architect (default: COUNCIL_ARCHITECT_MODEL)."),
    contrarianModel: z.string().optional().describe("Override model for the Contrarian (default: COUNCIL_CONTRARIAN_MODEL)."),
    architectEffort: ReasoningEffortSchema.optional().describe("Reasoning effort for the Architect: low | medium | high (default: medium)"),
    contrarianEffort: ReasoningEffortSchema.optional().describe("Reasoning effort for the Contrarian: low | medium | high (default: high)"),
  })
  .refine(hasConcreteCode, {
    message: "deliberate_council requires concrete code: provide relevant_code and/or context_files.",
    path: ["relevant_code"],
  });

export type DeliberationInput = z.infer<typeof DeliberationInputSchema>;

export const SingleConsultInputSchema = z.object({
  prompt: z.string().describe("The specific query, code block, or question to review."),
  ...BriefShape,
  model: z.string().optional().describe("Override model identifier."),
  effort: ReasoningEffortSchema.optional().describe("Reasoning effort level: low | medium | high."),
});

export type SingleConsultInput = z.infer<typeof SingleConsultInputSchema>;

export const TaskWorkerInputSchema = z.object({
  task: z.string().describe("The implementation subtask, utility function to write, unit tests to generate, or code refactor."),
  ...BriefShape,
  provider: z.enum(["deepseek", "openai"]).optional().describe("Which provider to use (default: deepseek for flash speed, or openai)."),
  model: z.string().optional().describe("Override model identifier (default: COUNCIL_DEEPSEEK_FLASH_MODEL or COUNCIL_OPENAI_WORKER_MODEL)."),
  effort: ReasoningEffortSchema.optional().describe("Reasoning effort level if using reasoning model (default: low for fast worker offload)."),
});

export type TaskWorkerInput = z.infer<typeof TaskWorkerInputSchema>;

export const FastContextReaderInputSchema = z.object({
  content: z.string().optional().describe("Large document, code snippet, log output, or cache to extract information from."),
  files: z.array(z.string()).optional().describe("File paths to read server-side instead of passing content inline. Optional line range suffix: 'src/a.ts:10-80'."),
  workspace_root: z.string().optional().describe("Absolute project root used to resolve relative file paths (default: server cwd)."),
  focus: z.string().describe("What to extract, summarize, or filter (e.g. 'all error traces', 'exported function signatures', 'summary of state changes')."),
  provider: z.enum(["deepseek", "openai"]).optional().describe("Which provider to use (default: deepseek)."),
  model: z.string().optional().describe("Override model identifier (default: COUNCIL_DEEPSEEK_FLASH_MODEL)."),
}).refine((v) => !!(v.content?.trim() || v.files?.length), {
  message: "Provide content and/or files.",
  path: ["content"],
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
