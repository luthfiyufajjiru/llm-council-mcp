import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is missing.");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    timeout: parseInt(process.env.COUNCIL_TIMEOUT_MS || "120000", 10),
  });
}

export function getDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is missing.");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    timeout: parseInt(process.env.COUNCIL_TIMEOUT_MS || "120000", 10),
  });
}

export const DEFAULT_ARCHITECT_MODEL = process.env.COUNCIL_ARCHITECT_MODEL || "gpt-5.6-sol";
export const DEFAULT_CONTRARIAN_MODEL = process.env.COUNCIL_CONTRARIAN_MODEL || "deepseek-v4-pro";

// Fast worker & context reader models
export const DEFAULT_DEEPSEEK_FLASH_MODEL = process.env.COUNCIL_DEEPSEEK_FLASH_MODEL || "deepseek-v4-flash";
export const DEFAULT_OPENAI_WORKER_MODEL = process.env.COUNCIL_OPENAI_WORKER_MODEL || "gpt-5.6-sol";
export const DEFAULT_OPENAI_WORKER_EFFORT = (process.env.COUNCIL_OPENAI_WORKER_EFFORT || "low") as "low" | "medium" | "high";

// Reasoning effort levels: "low" | "medium" | "high"
// Architect defaults to "medium" — structured design does not need exhaustive tree search.
// Contrarian defaults to "high"  — adversarial stress-testing requires maximum chain-of-thought depth.
export const DEFAULT_ARCHITECT_EFFORT = (process.env.COUNCIL_ARCHITECT_EFFORT || "medium") as "low" | "medium" | "high";
export const DEFAULT_CONTRARIAN_EFFORT = (process.env.COUNCIL_CONTRARIAN_EFFORT || "high") as "low" | "medium" | "high";
