---
name: mf-gen
description: >
  Smart multi-engine image generator for MythicFrame. Discovers available engines (BEI zero-key browser session vs Gemini API key), interactively asks user preferences, and guides setup if offline.
argument-hint: "<prompt>"
---

# MythicFrame Smart Generator (`/mf-gen`)

When the user runs `/mf-gen [prompt]` or asks to generate an image through MythicFrame:

## Step 1: Probe Available Engines
Call `mythic_status` to inspect current readiness:
- `serverRunning`: whether localhost:3488 & BEI bridge (58925) are running.
- `beiConnected`: whether Chrome extension is actively linked.
- `hasGeminiApiKey`: whether Gemini API key is configured.

If the server is offline, call `mythic_launch_server` before proceeding.

## Step 2: Interactive Engine Selection (if multiple or ambiguous)
If the user didn't specify an engine, or if neither is immediately configured, use `ask_question`:
- **Question**: *"How would you like to generate this image?"*
- **Options**:
  - `(Recommended) BEI Bridge (Zero API Key - uses active Chrome Gemini session)`
  - `Gemini API (Imagen 3 direct API key)`
  - `Optimize Prompt Only (copy & paste into web UI)`

### Guided Assistance:
- **If user chose BEI**:
  - Check if `tabs` has an open Gemini tab.
  - If not, call `mythic_open_tab` or guide them: *"Please open Chrome and log in at gemini.google.com with the BEI extension enabled."*
- **If user chose Gemini API**:
  - If no API key is set, prompt: *"Please enter your Gemini API key or set it at http://localhost:3488"* (link: https://ai.google.dev/gemini-api/docs/api-key).

## Step 3: Generation Execution
Call `mythic_smart_generate` with:
- `prompt`: the user's prompt.
- `engine`: `'bei'` | `'gemini-api'` | `'auto'` | `'prompt-only'`.
- `aspectRatio`: '1:1', '16:9', '9:16', '3:4', '4:3'.
- `style`: optional style snippet if requested.

## Step 4: Presentation
1. Embed the generated image: `![Generated Image](file:///...)`.
2. Provide a clickable markdown link: `[filename](file:///...)`.
3. Report engine used and generation time.
