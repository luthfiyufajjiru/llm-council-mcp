import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

/**
 * Council members are stateless chat completions with no repo access.
 * The host agent investigates (graphify, file reads) and passes the result as a brief.
 */
export const BriefShape = {
  system_overview: z
    .string()
    .optional()
    .describe("Host's understanding of the system: architecture, module boundaries, data flow, relevant graphify findings."),
  relevant_code: z
    .string()
    .optional()
    .describe("Code excerpts with file paths (signatures, interfaces, the code under discussion)."),
  context_files: z
    .array(z.string())
    .optional()
    .describe("File paths the server reads and attaches. Optional line range suffix: 'src/a.ts:10-80'. Relative paths resolve against workspace_root."),
  workspace_root: z
    .string()
    .optional()
    .describe("Absolute project root used to resolve relative context_files (default: server cwd)."),
  constraints: z.string().optional().describe("Hard constraints: conventions, performance budgets, compatibility, forbidden approaches."),
  prior_decisions: z.string().optional().describe("Decisions already made and approaches already tried or rejected, with reasons."),
  success_criteria: z.string().optional().describe("What done looks like; how the answer will be judged."),
  context: z.string().optional().describe("Any additional free-form context."),
};

export const BriefSchema = z.object(BriefShape);
export type Brief = z.infer<typeof BriefSchema>;

const MAX_FILE_CHARS = 100_000;
const MAX_TOTAL_FILE_CHARS = 400_000;
const DENIED_BASENAME = /^(\.env(\..*)?|.*\.(pem|key|p12|pfx)|id_(rsa|ed25519|ecdsa)(\.pub)?)$/i;

function parseFileSpec(spec: string): { file: string; start?: number; end?: number } {
  const m = /^(.*?):(\d+)(?:-(\d+))?$/.exec(spec);
  if (!m) return { file: spec };
  const start = parseInt(m[2], 10);
  return { file: m[1], start, end: m[3] ? parseInt(m[3], 10) : start };
}

export async function readContextFiles(
  specs: string[],
  root: string
): Promise<{ text: string; warnings: string[] }> {
  const warnings: string[] = [];
  const sections: string[] = [];
  let budget = MAX_TOTAL_FILE_CHARS;

  for (const spec of specs) {
    const { file, start, end } = parseFileSpec(spec);
    const abs = path.resolve(root, file);

    if (DENIED_BASENAME.test(path.basename(abs))) {
      warnings.push(`${spec}: refused (secret/key file)`);
      continue;
    }
    if (budget <= 0) {
      warnings.push(`${spec}: skipped (total file budget of ${MAX_TOTAL_FILE_CHARS} chars exhausted)`);
      continue;
    }

    try {
      let content = await fs.readFile(abs, "utf8");
      let label = file;
      if (start !== undefined) {
        const lines = content.split(/\r?\n/);
        content = lines
          .slice(start - 1, end)
          .map((l, i) => `${start + i}: ${l}`)
          .join("\n");
        label = `${file} (lines ${start}-${end})`;
      }
      const limit = Math.min(MAX_FILE_CHARS, budget);
      if (content.length > limit) {
        content = content.slice(0, limit) + `\n[... truncated at ${limit} chars]`;
        warnings.push(`${spec}: truncated`);
      }
      budget -= content.length;
      sections.push(`### ${label}\n\`\`\`\n${content}\n\`\`\``);
    } catch (e: any) {
      warnings.push(`${spec}: could not read (${e.code || e.message})`);
    }
  }

  return { text: sections.join("\n\n"), warnings };
}

/** Assembles the structured brief (everything except the task itself) into one message block. */
export async function buildBrief(brief: Brief): Promise<string> {
  const parts: string[] = [];
  const add = (title: string, body?: string) => {
    if (body && body.trim()) parts.push(`## ${title}\n${body.trim()}`);
  };

  add("SYSTEM OVERVIEW", brief.system_overview);
  add("CONSTRAINTS", brief.constraints);
  add("PRIOR DECISIONS / ATTEMPTS", brief.prior_decisions);
  add("SUCCESS CRITERIA", brief.success_criteria);
  add("RELEVANT CODE", brief.relevant_code);

  if (brief.context_files?.length) {
    const { text, warnings } = await readContextFiles(
      brief.context_files,
      brief.workspace_root || process.cwd()
    );
    add("ATTACHED FILES", text);
    add("ATTACHMENT WARNINGS", warnings.map((w) => `- ${w}`).join("\n"));
  }

  add("ADDITIONAL CONTEXT", brief.context);
  return parts.join("\n\n");
}

/** Deliberation requires an overview plus at least some concrete code (inline or by path). */
export function hasConcreteCode(b: Brief): boolean {
  return !!(b.relevant_code?.trim() || b.context_files?.length);
}
