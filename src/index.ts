import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startHttp, type CallLogger } from "./http.js";
import {
  consultArchitect,
  consultContrarian,
  deliberateCouncil,
  executeTaskWorker,
  readFastContext,
} from "./council.js";
import {
  DEFAULT_ARCHITECT_MODEL,
  DEFAULT_CONTRARIAN_MODEL,
  DEFAULT_DEEPSEEK_FLASH_MODEL,
  DEFAULT_OPENAI_WORKER_MODEL,
  DEFAULT_OPENAI_WORKER_EFFORT,
  DEFAULT_ARCHITECT_EFFORT,
  DEFAULT_CONTRARIAN_EFFORT,
} from "./providers.js";
import {
  DeliberationInputSchema,
  SingleConsultInputSchema,
  TaskWorkerInputSchema,
  FastContextReaderInputSchema,
} from "./types.js";

const createBareServer = () => new Server(
  {
    name: "llm-council-mcp",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Shared brief fields. Council members are blind (no repo/tool access): the host agent
// must investigate first (graphify, file reads) and pass what it learned here.
const briefProperties = {
  system_overview: {
    type: "string",
    description:
      "Your understanding of the system: architecture, module boundaries, data flow, relevant graphify findings. Investigate BEFORE calling; the council cannot see the repo.",
  },
  relevant_code: {
    type: "string",
    description: "Code excerpts with file paths: signatures, interfaces, and the code under discussion.",
  },
  context_files: {
    type: "array",
    items: { type: "string" },
    description:
      "File paths the server reads and attaches (secret/key files are refused; size-capped). Optional line range: 'src/a.ts:10-80'. Relative paths resolve against workspace_root.",
  },
  workspace_root: {
    type: "string",
    description: "Absolute project root for resolving relative context_files (default: server cwd).",
  },
  constraints: {
    type: "string",
    description: "Hard constraints: conventions, performance budgets, compatibility, forbidden approaches.",
  },
  prior_decisions: {
    type: "string",
    description: "Decisions already made and approaches already tried or rejected, with reasons.",
  },
  success_criteria: {
    type: "string",
    description: "What done looks like; how the answer will be judged.",
  },
  context: { type: "string", description: "Any additional free-form context." },
} as const;

const BRIEFING_PROTOCOL =
  " BRIEFING PROTOCOL: council members are blind (no repo or tool access). Investigate first (graphify, file reads), then pass your findings in the brief fields. Members end with 'Needs from host' requests; satisfy them and re-consult if material.";

const ADVISORY_NOTICE =
  "\n\n---\n_Advisory input only. The council cannot see your codebase and may be wrong. You (the executor) own the decision: verify claims against the actual code, adopt only what holds up, and disagree where warranted._";

const effortEnum =["low", "medium", "high"];

// Register Tools
function registerHandlers(server: Server, onCall?: CallLogger): void {
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "deliberate_council",
        description:
          `Runs a full multi-model LLM Council deliberation. Concurrently queries the Architect (${DEFAULT_ARCHITECT_MODEL}) for a structural blueprint and the Contrarian (${DEFAULT_CONTRARIAN_MODEL}) for adversarial critique and edge cases. Returns two ADVISORY perspectives; the calling agent remains the decision-maker and executor, and should weigh and verify them rather than follow them verbatim. Requires system_overview plus relevant_code and/or context_files.` +
          BRIEFING_PROTOCOL,
        inputSchema: {
          type: "object",
          properties: {
            problem: {
              type: "string",
              description:
                "The core engineering task, architectural question, design choice, or bug to solve.",
            },
            ...briefProperties,
            architectModel: {
              type: "string",
              description: `Optional override for the Architect model (default: ${DEFAULT_ARCHITECT_MODEL}).`,
            },
            contrarianModel: {
              type: "string",
              description: `Optional override for the Contrarian model (default: ${DEFAULT_CONTRARIAN_MODEL}).`,
            },
            architectEffort: {
              type: "string",
              enum: effortEnum,
              description: `Reasoning effort for the Architect (default: ${DEFAULT_ARCHITECT_EFFORT}). Use 'high' for complex cross-cutting concerns.`,
            },
            contrarianEffort: {
              type: "string",
              enum: effortEnum,
              description: `Reasoning effort for the Contrarian (default: ${DEFAULT_CONTRARIAN_EFFORT}). Maximum depth adversarial stress-testing.`,
            },
          },
          required: ["problem", "system_overview"],
        },
      },
      {
        name: "consult_architect",
        description:
          `Directly queries The Architect (${DEFAULT_ARCHITECT_MODEL}) for high-level system decomposition, modular design, API interfaces, and structured implementation steps.` +
          BRIEFING_PROTOCOL,
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "The architectural question, design specification, or system requirement.",
            },
            ...briefProperties,
            model: {
              type: "string",
              description: `Optional override for the Architect model (default: ${DEFAULT_ARCHITECT_MODEL}).`,
            },
            effort: {
              type: "string",
              enum: effortEnum,
              description: `Reasoning effort level (default: ${DEFAULT_ARCHITECT_EFFORT}).`,
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "consult_contrarian",
        description:
          `Directly queries The Contrarian (${DEFAULT_CONTRARIAN_MODEL}) for adversarial code review, bug-hunting, edge cases, race conditions, and over-engineering checks.` +
          BRIEFING_PROTOCOL,
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "The code snippet, proposed design, or logic to stress-test and critique.",
            },
            ...briefProperties,
            model: {
              type: "string",
              description: `Optional override for the Contrarian model (default: ${DEFAULT_CONTRARIAN_MODEL}).`,
            },
            effort: {
              type: "string",
              enum: effortEnum,
              description: `Reasoning effort level (default: ${DEFAULT_CONTRARIAN_EFFORT}). Maximum depth for adversarial critique.`,
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "offload_task",
        description:
          `Offloads a focused implementation subtask, utility function, unit test suite, regex, or refactoring step to a fast external worker (${DEFAULT_DEEPSEEK_FLASH_MODEL} via DeepSeek, or ${DEFAULT_OPENAI_WORKER_MODEL} via OpenAI) to save host agent context and execution limits. The worker is blind too: pass types/interfaces via the brief fields or context_files.`,
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description:
                "The exact subtask, function to write, unit test table, or transformation to perform.",
            },
            ...briefProperties,
            provider: {
              type: "string",
              enum: ["deepseek", "openai"],
              description:
                "Worker provider (default: 'deepseek' for sub-2s latency and minimal cost).",
            },
            model: {
              type: "string",
              description: `Optional model override (defaults to ${DEFAULT_DEEPSEEK_FLASH_MODEL} for deepseek, ${DEFAULT_OPENAI_WORKER_MODEL} for openai).`,
            },
            effort: {
              type: "string",
              enum: effortEnum,
              description: `Reasoning effort for the openai worker (default: '${DEFAULT_OPENAI_WORKER_EFFORT}').`,
            },
          },
          required: ["task"],
        },
      },
      {
        name: "fast_context_reader",
        description:
          `Parses, filters, or summarizes raw file contents, large logs, cache dumps, or complex schemas using a high-speed worker (${DEFAULT_DEEPSEEK_FLASH_MODEL}). Pass inline 'content' and/or file paths in 'files' so large files never enter the host context.`,
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description:
                "The raw text, code file, log output, or cached content to extract from. Optional if 'files' is given.",
            },
            files: {
              type: "array",
              items: { type: "string" },
              description: "File paths to read server-side. Optional line range: 'src/a.ts:10-80'.",
            },
            workspace_root: {
              type: "string",
              description: "Absolute project root for resolving relative paths (default: server cwd).",
            },
            focus: {
              type: "string",
              description:
                "Extraction target (e.g. 'all error stack traces', 'exported interface signatures', 'list of changed state variables').",
            },
            provider: {
              type: "string",
              enum: ["deepseek", "openai"],
              description: "Worker provider (default: 'deepseek').",
            },
            model: {
              type: "string",
              description: `Optional model override (default: ${DEFAULT_DEEPSEEK_FLASH_MODEL}).`,
            },
          },
          required: ["focus"],
        },
      },
    ],
  };
});

// Handle Tool Execution
const handleCall = async (request: { params: { name: string; arguments?: unknown } }) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "deliberate_council") {
      const parsed = DeliberationInputSchema.parse(args);
      const result = await deliberateCouncil(parsed);

      const formattedOutput = [
        `# LLM Council Deliberation Report\n`,
        `## Stage 1: The Architect's Proposal (${result.architect.model} | effort: ${result.architect.effort} | ${result.architect.durationMs}ms)`,
        result.architect.response,
        `\n---\n`,
        `## Stage 2: The Contrarian's Adversarial Critique (${result.contrarian.model} | effort: ${result.contrarian.effort} | ${result.contrarian.durationMs}ms)`,
        result.contrarian.response,
        `\n---\n`,
        `## Points of Tension to Weigh:`,
        ...result.tensionPoints.map((tp) => `- ${tp}`),
        ADVISORY_NOTICE,
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: formattedOutput,
          },
        ],
      };
    }

    if (name === "consult_architect") {
      const parsed = SingleConsultInputSchema.parse(args);
      const result = await consultArchitect(parsed);

      return {
        content: [
          {
            type: "text",
            text: `### The Architect's Guidance (${result.model} - ${result.durationMs}ms)\n\n${result.response}${ADVISORY_NOTICE}`,
          },
        ],
      };
    }

    if (name === "consult_contrarian") {
      const parsed = SingleConsultInputSchema.parse(args);
      const result = await consultContrarian(parsed);

      return {
        content: [
          {
            type: "text",
            text: `### The Contrarian's Adversarial Review (${result.model} - ${result.durationMs}ms)\n\n${result.response}${ADVISORY_NOTICE}`,
          },
        ],
      };
    }

    if (name === "offload_task") {
      const parsed = TaskWorkerInputSchema.parse(args);
      const result = await executeTaskWorker(parsed);

      return {
        content: [
          {
            type: "text",
            text: `### Worker Task Result (${result.provider}:${result.model} - ${result.durationMs}ms)\n\n${result.response}`,
          },
        ],
      };
    }

    if (name === "fast_context_reader") {
      const parsed = FastContextReaderInputSchema.parse(args);
      const result = await readFastContext(parsed);

      return {
        content: [
          {
            type: "text",
            text: `### Extracted Context (${result.provider}:${result.model} - ${result.durationMs}ms)\n\n${result.response}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool requested: ${name}`);
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing tool '${name}': ${error.message || String(error)}`,
        },
      ],
    };
  }
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startedAt = Date.now();
  const result = await handleCall(request);
  const first: any = result.content?.[0];
  onCall?.({
    tool: request.params.name,
    ok: !("isError" in result && result.isError),
    ms: Date.now() - startedAt,
    detail: "isError" in result && result.isError ? String(first?.text ?? "").slice(0, 160) : undefined,
  });
  return result;
});

}

function createServer(onCall?: CallLogger): Server {
  const server = createBareServer();
  registerHandlers(server, onCall);
  return server;
}

// Transport selection: stdio (default, per-host child process) or a shared HTTP
// service (--http) that every host on this machine can connect to.
async function main() {
  const args = process.argv.slice(2);
  const useHttp = args.includes("--http") || process.env.COUNCIL_TRANSPORT === "http";

  if (useHttp) {
    const arg = (name: string) => {
      const i = args.indexOf(name);
      return i >= 0 ? args[i + 1] : undefined;
    };
    startHttp(createServer, {
      host: arg("--host") || process.env.COUNCIL_HTTP_HOST || "127.0.0.1",
      port: parseInt(arg("--port") || process.env.COUNCIL_HTTP_PORT || "8765", 10),
      token: process.env.COUNCIL_HTTP_TOKEN || undefined,
    });
    return;
  }

  const transport = new StdioServerTransport();
  await createServer().connect(transport);
  console.error("LLM Council MCP Server running on stdio transport.");
}

main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
