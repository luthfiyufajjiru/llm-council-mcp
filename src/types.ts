import { z } from "zod";

export const ReasoningEffortSchema = z.enum(["low", "medium", "high"]);
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

export const DeliberationInputSchema = z.object({
  problem: z.string().describe("The core engineering task, architectural question, or bug to solve."),
  context: z.string().optional().describe("Relevant context, requirements, file snippets, or constraints."),
  architectModel: z.string().optional().describe("Override model for the Architect (default: COUNCIL_ARCHITECT_MODEL or gpt-5.6-sol)"),
  contrarianModel: z.string().optional().describe("Override model for the Contrarian (default: COUNCIL_CONTRARIAN_MODEL or deepseek-reasoner)"),
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
