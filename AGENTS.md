# Project Rules & AI Guidelines: MythicFrame

This document defines mandatory operational guardrails for AI coding assistants working in this workspace.

---

## 1. Permission Protocol: Zero Unauthorized Edits
* **Do NOT edit, create, or overwrite files without explicit approval**:
  - Present the planned change, affected files, and rationale first.
  - Ask for user confirmation before applying writes or edits (`write_to_file`, `replace_file_content`).
  - Do NOT perform unsolicited refactoring or stylistic reformatting. Keep edits minimal and focused.

## 2. No Over-Analysis
* Keep diagnostics and explanations concise, direct, and focused on the user's specific query.
* Do not produce speculative architecture breakdowns or multi-paragraph essays unless explicitly prompted.
* When searching or inspecting the codebase, read targeted lines and avoid dumping large file contents into the conversation.

## 3. MCP Server & External Tools Usage
* When using or introducing MCP tools (such as `mythic-image-gen`, `unity`, `rvt-mcp`, `gameloom`, etc.):
  1. Explain **how the tool is used** and what arguments it accepts.
  2. Ask for the user's confirmation before executing tools that generate external assets, invoke third-party APIs, or consume quotas/credits.
  3. Never trigger automated bulk generations without prior user consent.
