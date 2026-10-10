---
name: mf-gen
description: Smart multi-engine 2D game-art image generator for MythicFrame. Discovers available engines (zero-key BEI browser bridge vs Gemini API key), asks the user which to use when ambiguous, and guides setup if offline. Use when the user runs /mf-gen or asks MythicFrame to generate an image without naming a specific engine. Requires the mythic-image-gen MCP server.
argument-hint: "<prompt>"
---

# MythicFrame Smart Generator (`/mf-gen`)

Pick the best available engine and generate. Uses the `mythic-image-gen` MCP tools.

## Step 1 — Probe engines
Call `mythic_status`. Note:
- `serverRunning` — web server (3488) and BEI bridge (58925).
- `beiConnected` — Chrome extension linked with a usable tab.
- `hasGeminiApiKey` — Gemini API key configured.

If offline, have the user start the server (preferred over `mythic_launch_server`, which fails on system Node here):

```bash
cd /g/AI/Projects/mythic-frame && fnm use 22 && npm run dev
```

## Step 2 — Choose engine (if not specified)
If the user didn't name an engine, or more than one is ready, ask with AskUserQuestion:
- "BEI Bridge (zero key, uses your Chrome Gemini/ChatGPT session)" — recommended.
- "Gemini API (Imagen 3 direct, needs API key)".
- "Prompt only (optimize for copy-paste, no generation)".

Guided setup:
- Chose BEI but no tab → call `mythic_open_tab`, or tell them to log in at gemini.google.com with the extension enabled.
- Chose Gemini API but no key → ask them to set `GEMINI_API_KEY` in `.env.local` or in Settings at http://localhost:3488 (keys: https://ai.google.dev/gemini-api/docs/api-key).

## Step 3 — Generate
Call `mythic_smart_generate` with:
- `prompt`, `engine` (`auto` | `bei` | `gemini-api` | `prompt-only`), `aspectRatio`, optional `style`, optional `images`, `target`, `accountSlot`.

## Step 4 — Present the result
1. Embed: `![Generated Image](file:///...)`.
2. Clickable link: `[filename](file:///...)`.
3. Report the engine used and generation time.

Do not silently fall back to a non-MythicFrame image tool without the user's consent.
