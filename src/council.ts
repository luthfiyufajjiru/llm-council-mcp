import {
  getOpenAIClient,
  getDeepSeekClient,
  DEFAULT_ARCHITECT_MODEL,
  DEFAULT_CONTRARIAN_MODEL,
} from "./providers.js";
import {
  ARCHITECT_SYSTEM_PROMPT,
  CONTRARIAN_SYSTEM_PROMPT,
} from "./prompts.js";
import {
  CouncilMemberResult,
  DeliberationInput,
  DeliberationOutput,
  SingleConsultInput,
} from "./types.js";

export async function consultArchitect(
  input: SingleConsultInput
): Promise<CouncilMemberResult> {
  const model = input.model || DEFAULT_ARCHITECT_MODEL;
  const startTime = Date.now();

  try {
    const client = getOpenAIClient();
    const userMessage = input.context
      ? `CONTEXT:\n${input.context}\n\nTASK / QUESTION:\n${input.prompt}`
      : input.prompt;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: ARCHITECT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const choice = response.choices[0];
    return {
      role: "Architect & Planner",
      model,
      response: choice.message.content || "No content returned.",
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      role: "Architect & Planner",
      model,
      response: `Failed to consult Architect: ${error.message || String(error)}`,
      durationMs: Date.now() - startTime,
      error: error.message || String(error),
    };
  }
}

export async function consultContrarian(
  input: SingleConsultInput
): Promise<CouncilMemberResult> {
  const model = input.model || DEFAULT_CONTRARIAN_MODEL;
  const startTime = Date.now();

  try {
    const client = getDeepSeekClient();
    const userMessage = input.context
      ? `CONTEXT:\n${input.context}\n\nTASK / CODE / ARCHITECTURE TO CRITIQUE:\n${input.prompt}`
      : input.prompt;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: CONTRARIAN_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const choice = response.choices[0];
    const reasoning = (choice.message as any).reasoning_content;

    return {
      role: "Contrarian & Adversarial Reviewer",
      model,
      response: choice.message.content || "No content returned.",
      thinking: reasoning,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      role: "Contrarian & Adversarial Reviewer",
      model,
      response: `Failed to consult Contrarian: ${error.message || String(error)}`,
      durationMs: Date.now() - startTime,
      error: error.message || String(error),
    };
  }
}

export async function deliberateCouncil(
  input: DeliberationInput
): Promise<DeliberationOutput> {
  const architectModel = input.architectModel || DEFAULT_ARCHITECT_MODEL;
  const contrarianModel = input.contrarianModel || DEFAULT_CONTRARIAN_MODEL;

  // 1. Stage 1: Parallel Gathering (Independent generation)
  const [architectResult, contrarianResult] = await Promise.all([
    consultArchitect({
      prompt: input.problem,
      context: input.context,
      model: architectModel,
    }),
    consultContrarian({
      prompt: input.problem,
      context: input.context,
      model: contrarianModel,
    }),
  ]);

  // 2. Identify key tensions / points of comparison
  const tensionPoints: string[] = [];

  if (architectResult.error) {
    tensionPoints.push(`Architect Error: ${architectResult.error}`);
  }
  if (contrarianResult.error) {
    tensionPoints.push(`Contrarian Error: ${contrarianResult.error}`);
  }

  if (!architectResult.error && !contrarianResult.error) {
    tensionPoints.push(
      "Evaluate trade-offs between the Architect's modular structure vs. the Contrarian's simplicity/edge-case warnings."
    );
    tensionPoints.push(
      "Verify that the Contrarian's highlighted failure modes and edge cases are addressed in the final execution plan."
    );
  }

  return {
    architect: architectResult,
    contrarian: contrarianResult,
    tensionPoints,
  };
}
