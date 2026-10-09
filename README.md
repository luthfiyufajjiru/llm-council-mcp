# LLM Council MCP Server (`llm-council-mcp`)

> [!NOTE]
> **Attribution & Inspiration**: This project is inspired by **Andrej Karpathy's LLM Council** multi-perspective deliberation methodology. It operationalizes the 3-Stage Council Protocol (Independent Gathering, Adversarial Critique, and Chairman Synthesis) as a native **Model Context Protocol (MCP)** tool server for modern AI coding agents.

A high-performance, host-agnostic MCP server that empowers **Any AI Coding Agent (Google Antigravity, Claude Code, Codex, Cursor)** to remain the **primary thinker and Executor**, consulting the council as advisors (penasihat) while delegating:
- **Architectural Strategy & Modular Contracts** to **OpenAI (`gpt-5.6-sol`)** *(The Architect)*
- **Adversarial Critique & Edge-Case Stress Testing** to **DeepSeek (`deepseek-v4-pro` / `deepseek-reasoner`)** *(The Contrarian)*

Both models are queried **concurrently** via asynchronous I/O to minimize latency, giving any host agent frontier-grade peer review without slowing down execution.

---

## Architecture & 3-Stage Deliberation Protocol

```
                      ┌─────────────────────────────────────────┐
                      │        THE CHAIRMAN & EXECUTOR          │
                      │  (Dynamic Host: Antigravity / Claude /  │
                      │               Codex / Cursor)           │
                      │  Context Ingestion & Workspace State    │
                      └────────────────────┬────────────────────┘
                                           │
                              [MCP: deliberate_council]
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   ▼                                               ▼
        ┌─────────────────────┐                         ┌─────────────────────┐
        │    The Architect    │                         │   The Contrarian    │
        │  (OpenAI gpt-5.6)   │                         │(DeepSeek Reasoner)  │
        │  Stage 1: Gathering │   CONCURRENT ASYNC IO   │  Stage 2: Critique  │
        │  Modular contracts  │ ◄─────────────────────► │  Adversarial flaws, │
        │  & layout blueprint │   Independent Review    │  race conditions    │
        └──────────┬──────────┘                         └──────────┬──────────┘
                   │                                               │
                   └───────────────────────┬───────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │           CHAIRMAN'S DECREE             │
                      │      (Synthesized by Host Agent)        │
                      │  Reconciles tensions, produces decree,  │
                      │  edits files, and verifies builds       │
                      └─────────────────────────────────────────┘
```

1. **Stage 1: The Gathering (The Architect)**: OpenAI independently evaluates the problem, designing clean interface boundaries, type contracts, and sequence of changes.
2. **Stage 2: The Critique (The Contrarian)**: DeepSeek Reasoner independently stress-tests the problem, searching for race conditions, subtle logic regressions, and unnecessary over-engineering.
3. **Stage 3: The Executor's Decision (The Host Agent)**: The council is advisory only. The calling agent (Antigravity Gemini, Claude Code, or Codex/Cursor) receives both perspectives, verifies them against the real codebase, decides what to adopt, creates the implementation plan, and executes the workspace changes.

---

## Exposed MCP Tools

| Tool | Description |
| :--- | :--- |
| `deliberate_council` | Concurrently queries both the Architect (`gpt-5.6-sol`) and Contrarian (`deepseek-v4-pro`), returning a structured report with identified tension points as advisory input for the executor to weigh. |
| `consult_architect` | Single-target query to OpenAI for API schema design, interface planning, or modular file layouts. |
| `consult_contrarian` | Single-target query to DeepSeek-V4 Pro for adversarial code reviews, bug-hunting, edge cases, and over-engineering checks. |
| `offload_task` | Offloads focused implementation subtasks, utility code, unit test suites, or regex writing to high-speed workers (**DeepSeek-V4 Flash** or **OpenAI gpt-5-mini**). Prevents host turn/token depletion. |
| `fast_context_reader` | High-speed document/log parsing and filtering via **DeepSeek-V4 Flash** in ~1–2s. Extracts only requested signals without bloating host agent context. |

---

## Installation & Build

```bash
cd D:/Repositories/llm-council-mcp
npm install
npm run build
```

---

## Multi-Platform Configuration

### 1. Google Antigravity 2.0 / AGY CLI
Add to `~/.gemini/config/mcp_config.json`:

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

### 2. Claude Code / Claude Desktop
Add to `~/.claude/mcp.json` or `claude_desktop_config.json`:

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
        "DEEPSEEK_API_KEY": "sk-YOUR_DEEPSEEK_KEY"
      }
    }
  }
}
```

### 3. Cursor & Codex
Add the same server block to `~/.cursor/mcp.json` or Cursor Settings → Features → MCP.

---

## Environment Variables

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

## Economics & Cost Efficiency

Because the host orchestrator absorbs 95% of workspace file searches, git diffs, and terminal runs within your base plan, the Council only burns external API tokens during high-level planning rounds:

* **OpenAI (`gpt-5.6-sol`)**: ~\$0.025 / round
* **DeepSeek (`deepseek-v4-pro`)**: ~\$0.007 / round
* **Combined Cost**: **~\$0.032 (~3 to 4 cents) per full Council deliberation**.
* **A \$50 balance (\$35 OpenAI + \$15 DeepSeek)** funds **~1,400 full deliberations** (5 to 7+ months of active development).

---

## Credits & License
- Inspired by the **LLM Council** architecture conceived by **Andrej Karpathy**.
- Released under the [MIT License](LICENSE).
