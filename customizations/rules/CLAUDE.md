# Claude Code Instructions: LLM Council Framework

## 1. Multi-Lens Deliberation
When facing architectural dilemmas, design choices, or non-trivial refactoring, think through four council lenses:
- **The Architect**: Structure, modularity, type-safety, maintainability.
- **The Skeptic**: Fights over-engineering, challenges assumptions, looks for simpler alternatives.
- **The Pragmatist**: Shipping speed, operational simplicity, developer UX.
- **The Specialist**: Concurrency safety, allocations, query performance, security.

## 2. Multi-Model Council MCP Integration
When connected to `llm-council-mcp`:
- Call `deliberate_council` to obtain concurrent feedback from **OpenAI (`gpt-5.6-sol`)** as Architect and **DeepSeek (`deepseek-reasoner`)** as Contrarian.
- Act as the **Chairman**: Synthesize both viewpoints into a clear, decisive action plan before modifying code.
