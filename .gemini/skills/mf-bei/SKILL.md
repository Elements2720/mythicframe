---
name: mf-bei
description: >
  Generate images via MythicFrame BEI (Browser Extension Interface) with ZERO API key required. Uses active Google Gemini or ChatGPT browser sessions in Chrome.
argument-hint: "<prompt>"
---

# MythicFrame BEI Generator (`/mf-bei`)

When the user runs `/mf-bei [prompt]` or asks to generate an image using BEI:

## Step 1: Health & Engine Check
Call `mythic_status` to verify system health.
- If the server is offline (`serverRunning: false`), call `mythic_launch_server` to launch `localhost:3488` and the BEI bridge (`port 58925`).
- Check if BEI has an active Gemini or ChatGPT tab:
  - If `tabs.length === 0` or no active tab is found, ask the user with `ask_question`:
    - Question: *"BEI needs an active Google Gemini tab in Chrome. Would you like to open it now?"*
    - Options:
      - `(Recommended) Open Gemini tab in Chrome` -> Call `mythic_open_tab` with `target: 'gemini'`.
      - `I will open Chrome manually` -> Instruct user to open `https://gemini.google.com` and ensure the MythicFrame BEI extension is enabled.

## Step 2: Generation Dispatch
- Call `mythic_bei_generate` with:
  - `prompt`: the user's prompt (or optimized prompt if style/framing options were specified).
  - `aspectRatio`: requested aspect ratio (default `'1:1'`).
  - `target`: `'gemini'` (default) or `'chatgpt'`.
  - `accountSlot`: selected slot if specified.
  - `images`: array of reference images if provided by user.

## Step 3: Present Image & Link
When `mythic_bei_generate` returns the local file path:
1. Embed the generated image using standard markdown: `![Generated Image](file:///...)`.
2. Provide a clickable markdown link: `[filename](file:///...)` so the user can easily open it in their IDE or image viewer.
3. Show metadata: Account used, Job ID, and resolution.
