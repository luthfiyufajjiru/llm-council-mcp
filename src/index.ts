import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  consultArchitect,
  consultContrarian,
  deliberateCouncil,
  executeTaskWorker,
  readFastContext,
} from "./council.js";
import {
  DeliberationInputSchema,
  SingleConsultInputSchema,
  TaskWorkerInputSchema,
  FastContextReaderInputSchema,
} from "./types.js";

const server = new Server(
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

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "deliberate_council",
        description:
          "Runs a full multi-model LLM Council deliberation. Concurrently queries the Architect (OpenAI gpt-5.6-sol) for a structural blueprint and the Contrarian (DeepSeek-V4 Pro) for adversarial critique and edge cases. Returns both perspectives for the Host Agent (Chairman) to synthesize and execute.",
        inputSchema: {
          type: "object",
          properties: {
            problem: {
              type: "string",
              description:
                "The core engineering task, architectural question, design choice, or bug to solve.",
            },
            context: {
              type: "string",
              description:
                "Relevant context, codebase conventions, interface definitions, or constraints.",
            },
            architectModel: {
              type: "string",
              description:
                "Optional override for the Architect model (default: gpt-5.6-sol).",
            },
            contrarianModel: {
              type: "string",
              description:
                "Optional override for the Contrarian model (default: deepseek-v4-pro).",
            },
            architectEffort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description:
                "Reasoning effort for the Architect (default: medium). Use 'high' for complex cross-cutting concerns.",
            },
            contrarianEffort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description:
                "Reasoning effort for the Contrarian (default: high). Maximum depth adversarial stress-testing.",
            },
          },
          required: ["problem"],
        },
      },
      {
        name: "consult_architect",
        description:
          "Directly queries The Architect (OpenAI gpt-5.6-sol) for high-level system decomposition, modular design, API interfaces, and structured implementation steps.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "The architectural question, design specification, or system requirement.",
            },
            context: {
              type: "string",
              description:
                "Additional codebase background, existing file schemas, or constraints.",
            },
            model: {
              type: "string",
              description:
                "Optional override for the Architect model (default: gpt-5.6-sol).",
            },
            effort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description:
                "Reasoning effort level (default: medium).",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "consult_contrarian",
        description:
          "Directly queries The Contrarian (DeepSeek-V4 Pro) for adversarial code review, bug-hunting, edge cases, race conditions, and over-engineering checks.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "The code snippet, proposed design, or logic to stress-test and critique.",
            },
            context: {
              type: "string",
              description:
                "Surrounding system context, concurrency model, or requirements.",
            },
            model: {
              type: "string",
              description:
                "Optional override for the Contrarian model (default: deepseek-v4-pro).",
            },
            effort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description:
                "Reasoning effort level (default: high). Maximum depth for adversarial critique.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "offload_task",
        description:
          "Offloads a focused implementation subtask, utility function, unit test suite, regex, or refactoring step to a fast external worker (DeepSeek-V4 Flash or OpenAI gpt-5-mini) to save host agent context and execution limits.",
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description:
                "The exact subtask, function to write, unit test table, or transformation to perform.",
            },
            context: {
              type: "string",
              description:
                "Surrounding code, types, constraints, or interfaces needed to execute the task accurately.",
            },
            provider: {
              type: "string",
              enum: ["deepseek", "openai"],
              description:
                "Worker provider (default: 'deepseek' for sub-2s latency and minimal cost).",
            },
            model: {
              type: "string",
              description:
                "Optional model override (defaults to deepseek-v4-flash or gpt-5.6-sol).",
            },
            effort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description:
                "Reasoning effort if using a reasoning model (default: 'low' for GPT SOL to achieve sub-2s latency).",
            },
          },
          required: ["task"],
        },
      },
      {
        name: "fast_context_reader",
        description:
          "Parses, filters, or summarizes raw file contents, large logs, cache dumps, or complex schemas using a high-speed worker (DeepSeek-V4 Flash) in ~1-2 seconds. Prevents bloating host agent context window.",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description:
                "The raw text, code file, log output, or cached content to extract from.",
            },
            focus: {
              type: "string",
              description:
                "Extraction target (e.g. 'all error stack traces', 'exported interface signatures', 'list of changed state variables').",
            },
            provider: {
              type: "string",
              enum: ["deepseek", "openai"],
              description:
                "Worker provider (default: 'deepseek').",
            },
            model: {
              type: "string",
              description:
                "Optional model override (default: deepseek-v4-flash).",
            },
          },
          required: ["content", "focus"],
        },
      },
    ],
  };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
        `## Key Tension Points & Synthesis Focus for Chairman:`,
        ...result.tensionPoints.map((tp) => `- ${tp}`),
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
            text: `### The Architect's Guidance (${result.model} - ${result.durationMs}ms)\n\n${result.response}`,
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
            text: `### The Contrarian's Adversarial Review (${result.model} - ${result.durationMs}ms)\n\n${result.response}`,
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
});

// Start Server Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LLM Council MCP Server running on stdio transport.");
}

main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
