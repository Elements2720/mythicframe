---
name: mf-bei
description: Generate 2D game-art images through MythicFrame's BEI (Browser Extension Interface) with zero API key, driving an authenticated Google Gemini or ChatGPT tab in Chrome. Use when the user runs /mf-bei or asks to generate an image via BEI / the browser bridge. Requires the mythic-image-gen MCP server.
argument-hint: "<prompt>"
---

# MythicFrame BEI Generator (`/mf-bei`)

Generate an image through the browser bridge (no API key). Uses the `mythic-image-gen` MCP tools.

## Step 1 — Health & engine check
Call `mythic_status`.
- If the web server / bridge is offline, the user starts it themselves. On this machine the project runs on Node 22 via fnm, so prefer this command over the `mythic_launch_server` tool (which uses system Node and fails to build better-sqlite3):

  ```bash
  cd /g/AI/Projects/mythic-frame && fnm use 22 && npm run dev
  ```

- If `mythic_status` reports no connected Gemini/ChatGPT tab (`beiConnected: false` or no tab), ask the user with AskUserQuestion whether to open one:
  - "Open Gemini tab in Chrome" → call `mythic_open_tab` with `target: 'gemini'`.
  - "I'll open it manually" → tell them to open https://gemini.google.com and confirm the MythicFrame BEI extension is loaded (`chrome://extensions`).

## Step 2 — Generate
Call `mythic_bei_generate` with:
- `prompt` — the user's prompt (fold in style/framing if they gave any).
- `aspectRatio` — one of `1:1`, `16:9`, `9:16`, `3:4`, `4:3` (default `1:1`).
- `target` — `gemini` (default) or `chatgpt`.
- `accountSlot` — only if the user picked a specific account slot.
- `images` — reference image paths or base64 data URIs, if provided.

## Step 3 — Present the result
The tool returns a saved file path under `outputs/bei/`. Then:
1. Embed it: `![Generated Image](file:///...)`.
2. Add a clickable link: `[filename](file:///...)`.
3. Report account/slot, Job ID, and aspect ratio.

If generation fails, report the error from the tool and diagnose (tab logged in? bridge connected?). Do not silently fall back to another image tool without the user's consent.
