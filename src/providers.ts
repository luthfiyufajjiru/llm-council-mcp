import OpenAI from "openai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config(); // fallback to cwd

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

// DeepSeek V4.1 aliases -> the API's canonical ids (GET /models lists only these two):
//   Flash -> "deepseek-flash", Pro -> "deepseek-v4-pro". Bare "v4.1" means Flash (the default).
// Unknown names (e.g. "deepseek-reasoner") pass through unchanged.
const DEEPSEEK_FLASH_ALIASES = new Set([
  "deepseek-flash", "deepseek-v4-flash", "deepseek-v4.1-flash", "deepseek-v4.1",
  "deepseek-4.1", "v4.1", "4.1",
]);
const DEEPSEEK_PRO_ALIASES = new Set([
  "deepseek-pro", "deepseek-v4-pro", "deepseek-v4.1-pro", "deepseek-4.1-pro", "v4.1-pro",
]);

export function normalizeDeepSeekModel(model?: string): string {
  if (!model) return DEFAULT_CONTRARIAN_MODEL;
  const m = model.toLowerCase().trim();
  if (DEEPSEEK_FLASH_ALIASES.has(m)) return "deepseek-flash";
  if (DEEPSEEK_PRO_ALIASES.has(m)) return "deepseek-v4-pro";
  return model;
}

export const DEFAULT_ARCHITECT_MODEL = process.env.COUNCIL_ARCHITECT_MODEL || "gpt-6-astra";
export const DEFAULT_CONTRARIAN_MODEL = process.env.COUNCIL_CONTRARIAN_MODEL || "deepseek-flash";

// Fast worker & context reader models (DeepSeek-V4.1 Flash via 'deepseek-flash')
export const DEFAULT_DEEPSEEK_FLASH_MODEL = process.env.COUNCIL_DEEPSEEK_FLASH_MODEL || "deepseek-flash";
export const DEFAULT_OPENAI_WORKER_MODEL = process.env.COUNCIL_OPENAI_WORKER_MODEL || "gpt-6-astra";
export const DEFAULT_OPENAI_WORKER_EFFORT = (process.env.COUNCIL_OPENAI_WORKER_EFFORT || "low") as "low" | "medium" | "high";

// Reasoning effort levels: "low" | "medium" | "high"
// Architect defaults to "medium" - structured design does not need exhaustive tree search.
// Contrarian defaults to "high"  - adversarial stress-testing requires maximum chain-of-thought depth.
export const DEFAULT_ARCHITECT_EFFORT = (process.env.COUNCIL_ARCHITECT_EFFORT || "medium") as "low" | "medium" | "high";
export const DEFAULT_CONTRARIAN_EFFORT = (process.env.COUNCIL_CONTRARIAN_EFFORT || "high") as "low" | "medium" | "high";
