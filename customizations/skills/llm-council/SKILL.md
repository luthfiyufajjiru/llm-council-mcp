---
name: llm-council
description: Multi-model deliberation protocol using OpenAI (Architect) and DeepSeek (Contrarian) via MCP. Use when analyzing complex architectural choices, critical refactorings, or ambiguous design trade-offs.
---

# LLM Council Skill

## When to Activate
Activate this skill when:
- Designing new modules, major abstractions, or complex database schemas.
- Resolving tricky concurrency, distributed system, or state management issues.
- Needing a second opinion and adversarial stress-test before executing large refactors.

## Execution Workflow
1. Gather the necessary context (interfaces, types, error logs, requirements).
2. Call the `deliberate_council` MCP tool from `llm-council-mcp`.
3. Review the Architect's proposal against the Contrarian's critique.
4. Synthesize the final decision as the Chairman and execute.
