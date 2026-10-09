import {
  getOpenAIClient,
  getDeepSeekClient,
  DEFAULT_ARCHITECT_MODEL,
  DEFAULT_CONTRARIAN_MODEL,
  DEFAULT_DEEPSEEK_FLASH_MODEL,
  DEFAULT_OPENAI_WORKER_MODEL,
  DEFAULT_OPENAI_WORKER_EFFORT,
  DEFAULT_ARCHITECT_EFFORT,
  DEFAULT_CONTRARIAN_EFFORT,
  normalizeDeepSeekModel,
} from "./providers.js";
import {
  ARCHITECT_SYSTEM_PROMPT,
  CONTRARIAN_SYSTEM_PROMPT,
  WORKER_SYSTEM_PROMPT,
  CONTEXT_READER_SYSTEM_PROMPT,
} from "./prompts.js";
import {
  CouncilMemberResult,
  DeliberationInput,
  DeliberationOutput,
  SingleConsultInput,
  TaskWorkerInput,
  FastContextReaderInput,
  WorkerResult,
} from "./types.js";
import { buildBrief, readContextFiles } from "./brief.js";

export async function consultArchitect(
  input: SingleConsultInput
): Promise<CouncilMemberResult> {
  const model = input.model || DEFAULT_ARCHITECT_MODEL;
  const effort = input.effort || DEFAULT_ARCHITECT_EFFORT;
  const startTime = Date.now();

  try {
    const client = getOpenAIClient();
    const brief = await buildBrief(input);
    const userMessage = brief
      ? `# BRIEF (compiled by the host agent from its codebase investigation)\n${brief}\n\n# TASK / QUESTION\n${input.prompt}`
      : input.prompt;

    const response = await client.chat.completions.create({
      model,
      reasoning_effort: effort,
      messages: [
        { role: "system", content: ARCHITECT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    } as any);

    const choice = response.choices[0];
    return {
      role: "Architect & Planner",
      model,
      effort,
      response: choice.message.content || "No content returned.",
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      role: "Architect & Planner",
      model,
      effort,
      response: `Failed to consult Architect: ${error.message || String(error)}`,
      durationMs: Date.now() - startTime,
      error: error.message || String(error),
    };
  }
}

export async function consultContrarian(
  input: SingleConsultInput
): Promise<CouncilMemberResult> {
  const model = normalizeDeepSeekModel(input.model || DEFAULT_CONTRARIAN_MODEL);
  const effort = input.effort || DEFAULT_CONTRARIAN_EFFORT;
  const startTime = Date.now();

  try {
    const client = getDeepSeekClient();
    const brief = await buildBrief(input);
    const userMessage = brief
      ? `# BRIEF (compiled by the host agent from its codebase investigation)\n${brief}\n\n# TASK / CODE / ARCHITECTURE TO CRITIQUE\n${input.prompt}`
      : input.prompt;

    const response = await client.chat.completions.create({
      model,
      reasoning_effort: effort,
      messages: [
        { role: "system", content: CONTRARIAN_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    } as any);

    const choice = response.choices[0];
    const reasoning = (choice.message as any).reasoning_content;

    return {
      role: "Contrarian & Adversarial Reviewer",
      model,
      effort,
      response: choice.message.content || "No content returned.",
      thinking: reasoning,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      role: "Contrarian & Adversarial Reviewer",
      model,
      effort,
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
  const contrarianModel = normalizeDeepSeekModel(input.contrarianModel || DEFAULT_CONTRARIAN_MODEL);
  const architectEffort = input.architectEffort || DEFAULT_ARCHITECT_EFFORT;
  const contrarianEffort = input.contrarianEffort || DEFAULT_CONTRARIAN_EFFORT;

  // Stage 1: Parallel Gathering (Independent generation, no cross-contamination)
  const [architectResult, contrarianResult] = await Promise.all([
    consultArchitect({
      ...input,
      prompt: input.problem,
      model: architectModel,
      effort: architectEffort,
    }),
    consultContrarian({
      ...input,
      prompt: input.problem,
      model: contrarianModel,
      effort: contrarianEffort,
    }),
  ]);

  // Stage 2: Identify key tensions / points of comparison for the executor to weigh
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
      "Collect every 'Needs from host' request from both members, investigate them (graphify, file reads), and re-consult with an enriched brief if any are material."
    );
    tensionPoints.push(
      "Collect every 'Needs from host' request from both members, investigate them (graphify, file reads), and re-consult with an enriched brief if any are material."
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

export async function executeTaskWorker(
  input: TaskWorkerInput
): Promise<WorkerResult> {
  const provider = input.provider || "deepseek";
  const rawModel =
    input.model ||
    (provider === "openai" ? DEFAULT_OPENAI_WORKER_MODEL : DEFAULT_DEEPSEEK_FLASH_MODEL);
  const model = provider === "deepseek" ? normalizeDeepSeekModel(rawModel) : rawModel;
  const effort = input.effort || (provider === "openai" ? DEFAULT_OPENAI_WORKER_EFFORT : undefined);
  const startTime = Date.now();

  try {
    const client = provider === "openai" ? getOpenAIClient() : getDeepSeekClient();
    const brief = await buildBrief(input);
    const userMessage = brief
      ? `# CONTEXT\n${brief}\n\n# TASK TO COMPLETE\n${input.task}`
      : input.task;

    const requestPayload: any = {
      model,
      messages: [
        { role: "system", content: WORKER_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    };

    if (effort) {
      requestPayload.reasoning_effort = effort;
    }

    const response = await client.chat.completions.create(requestPayload);

    const choice = response.choices[0];
    return {
      provider,
      model,
      response: choice.message.content || "No content returned.",
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      provider,
      model,
      response: `Worker task execution failed: ${error.message || String(error)}`,
      durationMs: Date.now() - startTime,
      error: error.message || String(error),
    };
  }
}

export async function readFastContext(
  input: FastContextReaderInput
): Promise<WorkerResult> {
  const provider = input.provider || "deepseek";
  const rawModel =
    input.model ||
    (provider === "openai" ? DEFAULT_OPENAI_WORKER_MODEL : DEFAULT_DEEPSEEK_FLASH_MODEL);
  const model = provider === "deepseek" ? normalizeDeepSeekModel(rawModel) : rawModel;
  const startTime = Date.now();

  try {
    const client = provider === "openai" ? getOpenAIClient() : getDeepSeekClient();
    const sources: string[] = [];
    if (input.content?.trim()) sources.push(input.content);
    if (input.files?.length) {
      const { text, warnings } = await readContextFiles(input.files, input.workspace_root || process.cwd());
      if (text) sources.push(text);
      if (warnings.length) sources.push(`[file warnings]\n${warnings.map((w) => `- ${w}`).join("\n")}`);
    }
    const userMessage = `CONTENT TO PARSE:\n${sources.join("\n\n")}\n\nFOCUS / EXTRACTION DIRECTIVE:\n${input.focus}`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: CONTEXT_READER_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const choice = response.choices[0];
    return {
      provider,
      model,
      response: choice.message.content || "No content returned.",
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      provider,
      model,
      response: `Fast context reading failed: ${error.message || String(error)}`,
      durationMs: Date.now() - startTime,
      error: error.message || String(error),
    };
  }
}
