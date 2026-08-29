# 🏛️ LLM Council MCP Server (`llm-council-mcp`)

A high-performance Model Context Protocol (MCP) server that empowers **Antigravity 2.0 (Gemini 3.7 Flash)** to act as the primary Orchestrator & Executor while delegating:
- **Architectural Design & Planning** to **OpenAI (`gpt-5.6-sol`)**
- **Adversarial Critique & Edge-Case Stress Testing** to **DeepSeek (`deepseek-v4-pro` / `deepseek-reasoner`)**

Both external models are queried **concurrently** via asynchronous I/O to minimize latency.

---

## 🚀 Features

- **Multi-Model Deliberation (`deliberate_council`)**: Queries both the Architect and the Contrarian in parallel, producing a structured report with tension points for Gemini to synthesize.
- **Architect on Demand (`consult_architect`)**: Direct single query to OpenAI for API contracts, schema layout, and modular design.
- **Contrarian on Demand (`consult_contrarian`)**: Direct single query to DeepSeek Reasoner for bug-hunting, edge cases, race conditions, and over-engineering checks.
- **Cost-Optimized Hybrid Economics**: Gemini absorbs 95% of workspace file I/O and terminal execution, while OpenAI and DeepSeek only fire during architectural planning.

---

## 📦 Installation & Build

```bash
cd D:/Repositories/llm-council-mcp
npm install
npm run build
```

---

## ⚙️ Antigravity Configuration

Add the server to your global Antigravity MCP configuration file (`~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "llm-council": {
      "command": "node",
      "args": [
        "D:/Repositories/llm-council-mcp/dist/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "sk-proj-YOUR_OPENAI_KEY",
        "DEEPSEEK_API_KEY": "sk-YOUR_DEEPSEEK_KEY",
        "COUNCIL_ARCHITECT_MODEL": "gpt-5.6-sol",
        "COUNCIL_CONTRARIAN_MODEL": "deepseek-reasoner",
        "COUNCIL_TIMEOUT_MS": "120000"
      }
    }
  }
}
```

---

## 🛠️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | Your OpenAI Platform API key (`sk-proj-...`) | *Required* |
| `DEEPSEEK_API_KEY` | Your DeepSeek Platform API key (`sk-...`) | *Required* |
| `OPENAI_BASE_URL` | OpenAI API Base URL | `https://api.openai.com/v1` |
| `DEEPSEEK_BASE_URL` | DeepSeek API Base URL | `https://api.deepseek.com` |
| `COUNCIL_ARCHITECT_MODEL` | Default model for the Architect role | `gpt-5.6-sol` |
| `COUNCIL_CONTRARIAN_MODEL` | Default model for the Contrarian role | `deepseek-reasoner` |
| `COUNCIL_TIMEOUT_MS` | Max API timeout in milliseconds | `120000` (2 minutes) |

---

## 📄 License
MIT
