---
name: llm-council
description: Multi-model deliberation protocol and fast external task offloading (DeepSeek & OpenAI) via MCP. Use for architectural trade-offs, adversarial code review, small task delegation, and fast context reading.
---

# LLM Council & Worker Offload Skill

## When to Activate
Activate this skill when:
- Designing new modules, major abstractions, or complex database schemas.
- Resolving tricky concurrency, distributed system, or state management issues.
- Needing a second opinion and adversarial stress-test before executing large refactors.
- Offloading focused implementation subtasks, boilerplate, unit test tables, or utility code to an external worker.
- Reading, compressing, or filtering large files, cache dumps, or logs without bloating host context.

## Execution Workflow

### 1. Architectural Deliberation (The Council)
- Call `deliberate_council` to consult **The Architect (OpenAI gpt-5.6-sol)** and **The Contrarian (DeepSeek-V4 Pro)** in parallel.
- Act as the **Chairman**: Reconcile both perspectives, resolve tension points, and synthesize the final plan.

### 2. Task Offloading (The Worker)
- Call `offload_task` to delegate focused implementation steps (e.g. generating helper functions, writing unit tests, transforming schemas) to **DeepSeek-V4 Flash** or **OpenAI gpt-5-mini**.
- Reduces host token usage and bypasses rate/turn limits on the main IDE agent.

### 3. Fast Context Reading & Filtering
- Call `fast_context_reader` to parse large text, logs, or cached files and extract only the relevant signals (e.g. error traces, function signatures, state mutations) in ~1-2 seconds.
