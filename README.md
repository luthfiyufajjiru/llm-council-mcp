# LLM Council MCP Server (`llm-council-mcp`)

> [!NOTE]
> **Attribution & Inspiration**: This project is inspired by **Andrej Karpathy's LLM Council** multi-perspective deliberation methodology. It operationalizes the 3-Stage Council Protocol (Independent Gathering, Adversarial Critique, and Chairman Synthesis) as a native **Model Context Protocol (MCP)** tool server for modern AI coding agents.

A high-performance, host-agnostic MCP server that empowers **Any AI Coding Agent (Google Antigravity, Claude Code, Codex, Cursor)** to remain the **primary thinker and Executor**, consulting the council as advisors (penasihat) while delegating:
- **Architectural Strategy & Modular Contracts** to **OpenAI (`gpt-6-astra` by default)** *(The Architect)*
- **Adversarial Critique & Edge-Case Stress Testing** to **DeepSeek (`deepseek-flash` by default)** *(The Contrarian)*

Both models are queried **concurrently** via asynchronous I/O to minimize latency, giving any host agent frontier-grade peer review without slowing down execution.

---

## Architecture & 3-Stage Deliberation Protocol

```
                      ┌─────────────────────────────────────────┐
                      │        THE EXECUTOR (DECIDES)           │
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
        │  (OpenAI)           │                         │(DeepSeek)           │
        │  Stage 1: Gathering │   CONCURRENT ASYNC IO   │  Stage 2: Critique  │
        │  Modular contracts  │ ◄─────────────────────► │  Adversarial flaws, │
        │  & layout blueprint │   Independent Review    │  race conditions    │
        └──────────┬──────────┘                         └──────────┬──────────┘
                   │                                               │
                   └───────────────────────┬───────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │           EXECUTOR'S DECISION           │
                      │      (Synthesized by Host Agent)        │
                      │  Weighs advice, verifies it in code,    │
                      │  decides, edits files, builds           │
                      └─────────────────────────────────────────┘
```

1. **Stage 1: The Gathering (The Architect)**: OpenAI independently evaluates the problem, designing clean interface boundaries, type contracts, and sequence of changes.
2. **Stage 2: The Critique (The Contrarian)**: DeepSeek independently stress-tests the problem, searching for race conditions, subtle logic regressions, and unnecessary over-engineering.
3. **Stage 3: The Executor's Decision (The Host Agent)**: The council is advisory only. The calling agent (Antigravity Gemini, Claude Code, or Codex/Cursor) receives both perspectives, verifies them against the real codebase, decides what to adopt, creates the implementation plan, and executes the workspace changes.

---

## Exposed MCP Tools

| Tool | Description |
| :--- | :--- |
| `deliberate_council` | Queries the Architect and Contrarian concurrently and returns both as **advisory** input plus points of tension. Requires `system_overview` and `relevant_code` and/or `context_files`. |
| `consult_architect` | Single-target advisory query to the Architect for API schema design, interface planning, or module layouts. |
| `consult_contrarian` | Single-target advisory query to the Contrarian for adversarial review, bug-hunting, edge cases, and over-engineering checks. |
| `offload_task` | Delegated work, not advice: offloads a focused subtask (utility code, unit tests, regex) to a fast worker (DeepSeek Flash or OpenAI). The executor reviews the result like any delegated work. |
| `fast_context_reader` | Parses or filters large logs and files with a fast worker, from inline `content` and/or server-read `files`, so they never enter the host context. |

The council is **advisory**: the calling agent stays the primary thinker and decision-maker, and every council response ends with a notice saying so. Council members are **blind** (no repo or tool access): they see only what the host sends.

## Briefing the Council

The host should investigate first (graphify, file reads) and send what it learned. All council tools and `offload_task` accept these fields:

| Field | Purpose |
| :--- | :--- |
| `system_overview` | Architecture, module boundaries, data flow, graphify findings (**required** for `deliberate_council`). |
| `relevant_code` | Code excerpts with paths. |
| `context_files` | File paths the server reads and attaches. Optional line range: `src/a.ts:10-80`. Relative paths resolve against `workspace_root`. Capped at 100k chars per file and 400k total; `.env*`, `*.pem`, `*.key` and SSH keys are refused. |
| `workspace_root` | Absolute project root for relative paths (default: server cwd). |
| `constraints`, `prior_decisions`, `success_criteria`, `context` | Hard constraints, what was already decided or tried, what done looks like, and any extra notes. |

Members label assumptions and end with a **Needs from host** section; the host should satisfy those requests and re-consult if they matter.

---

## Installation & Build

```bash
cd D:/Repositories/llm-council-mcp
npm install
npm run build
```

---

## Recommended: Shared HTTP Service (one server for every host on the machine)

Instead of each host spawning its own stdio child process, run a single stateless Streamable HTTP server that Antigravity, Claude Code, etc. all connect to. It binds to loopback only and rejects non-local `Origin` headers; set `COUNCIL_HTTP_TOKEN` to additionally require `Authorization: Bearer <token>`.

```bash
npm run build
node dist/index.js --http --port 8765     # or COUNCIL_TRANSPORT=http
```

Start at logon (Windows Task Scheduler, hidden, logs to `council.log`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1          # install
powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1 -Uninstall
```

After a rebuild, restart with `Stop-ScheduledTask LLMCouncilMCP; Start-ScheduledTask LLMCouncilMCP`. The server is stateless, so hosts reconnect without session errors.

Host config:

- Claude Code: `claude mcp add --scope user --transport http llm-council http://127.0.0.1:8765/mcp`
- Antigravity (`mcp_config.json`): `"llm-council": { "serverUrl": "http://127.0.0.1:8765/mcp" }`

Health check: `http://127.0.0.1:8765/health`.

API keys and model settings come from `.env` in the repo root (see `.env.example`), so host configs never contain secrets.

Each request is logged to `council.log` (PowerShell writes it as UTF-16; use `tr -d '\0'` before grepping):

```
[2026-10-09T03:38:48Z] tools/call ua=Go-http-client/1.1
[2026-10-09T03:39:26Z] tool=deliberate_council ok 37934ms ua=Go-http-client/1.1
```

Failed calls log `ERROR` with up to 500 characters of the message. The client name appears only on the `initialize` line.

---

## Alternative: per-host stdio configuration

Each host spawns its own copy. Keys can live in `.env` instead of the `env` block.

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
        "COUNCIL_ARCHITECT_MODEL": "gpt-6-astra",
        "COUNCIL_CONTRARIAN_MODEL": "deepseek-flash",
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
| `COUNCIL_ARCHITECT_MODEL` | Default model for the Architect | `gpt-6-astra` |
| `COUNCIL_CONTRARIAN_MODEL` | Default model for the Contrarian | `deepseek-flash` |
| `COUNCIL_ARCHITECT_EFFORT` / `COUNCIL_CONTRARIAN_EFFORT` | Reasoning effort (`low`/`medium`/`high`) | `medium` / `high` |
| `COUNCIL_DEEPSEEK_FLASH_MODEL` | Worker model for DeepSeek (`offload_task`, `fast_context_reader`) | `deepseek-flash` |
| `COUNCIL_OPENAI_WORKER_MODEL` / `COUNCIL_OPENAI_WORKER_EFFORT` | Worker model and effort for OpenAI | `gpt-6-astra` / `low` |
| `COUNCIL_TIMEOUT_MS` | Max API timeout in milliseconds | `120000` (2 minutes) |
| `COUNCIL_TRANSPORT` | Set to `http` to serve HTTP instead of stdio (same as `--http`) | stdio |
| `COUNCIL_HTTP_HOST` / `COUNCIL_HTTP_PORT` | HTTP bind address and port (`--host` / `--port`) | `127.0.0.1` / `8765` |
| `COUNCIL_HTTP_TOKEN` | If set, requests must send `Authorization: Bearer <token>` | *unset* |

---

## Economics & Cost Efficiency

Because the host orchestrator absorbs 95% of workspace file searches, git diffs, and terminal runs within your base plan, the Council only burns external API tokens during high-level planning rounds. *(Figures below were measured with earlier model defaults; re-measure for your current models.)*

* **OpenAI (`gpt-5.6-sol`)**: ~\$0.025 / round
* **DeepSeek (`deepseek-v4-pro`)**: ~\$0.007 / round
* **Combined Cost**: **~\$0.032 (~3 to 4 cents) per full Council deliberation**.
* **A \$50 balance (\$35 OpenAI + \$15 DeepSeek)** funds **~1,400 full deliberations** (5 to 7+ months of active development).

---

## Credits & License
- Inspired by the **LLM Council** architecture conceived by **Andrej Karpathy**.
- Released under the [MIT License](LICENSE).
