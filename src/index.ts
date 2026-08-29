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
} from "./council.js";
import {
  DeliberationInputSchema,
  SingleConsultInputSchema,
} from "./types.js";

const server = new Server(
  {
    name: "llm-council-mcp",
    version: "1.0.0",
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
          "Runs a full multi-model LLM Council deliberation. Concurrently queries the Architect (OpenAI gpt-5.6-sol) for a structural blueprint and the Contrarian (DeepSeek-V4 Pro / Reasoner) for adversarial critique and edge cases. Returns both perspectives for Gemini synthesis.",
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
                "Optional override for the Contrarian model (default: deepseek-reasoner).",
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
          },
          required: ["prompt"],
        },
      },
      {
        name: "consult_contrarian",
        description:
          "Directly queries The Contrarian (DeepSeek-V4 Pro / Reasoner) for adversarial code review, bug-hunting, edge cases, race conditions, and over-engineering checks.",
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
                "Optional override for the Contrarian model (default: deepseek-reasoner).",
            },
          },
          required: ["prompt"],
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
        `# 🏛️ LLM Council Deliberation Report\n`,
        `## 📐 Stage 1: The Architect's Proposal (${result.architect.model} - ${result.architect.durationMs}ms)`,
        result.architect.response,
        `\n---\n`,
        `## ⚡ Stage 2: The Contrarian's Adversarial Critique (${result.contrarian.model} - ${result.contrarian.durationMs}ms)`,
        result.contrarian.response,
        `\n---\n`,
        `## ⚖️ Key Tension Points & Synthesis Focus for Chairman:`,
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
            text: `### 📐 The Architect's Guidance (${result.model} - ${result.durationMs}ms)\n\n${result.response}`,
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
            text: `### ⚡ The Contrarian's Adversarial Review (${result.model} - ${result.durationMs}ms)\n\n${result.response}`,
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
  console.error("🏛️ LLM Council MCP Server running on stdio transport.");
}

main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
