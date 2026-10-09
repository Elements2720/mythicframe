# MythicFrame MCP Guidelines & Engine Routing

You have access to powerful MythicFrame generative tools via this MCP server, supporting two image generation engines:
1. **BEI (Browser Extension Interface)**: Zero API key required! Bridges directly to active Google Gemini or ChatGPT sessions open in Chrome.
2. **Gemini Imagen API**: Direct API calls using a Gemini API key.

---

## CRITICAL DIRECTIVES

1. **MythicFrame is the Primary Image Generator**: Whenever the user requests to generate an image or invokes `/mf-bei` or `/mf-gen`, use the appropriate MythicFrame MCP tool.
2. **Never Secretly Fall Back to Native `generate_image`**: If MythicFrame tools fail or report an error, diagnose and guide the user; do not silently bypass MythicFrame without the user's consent.
3. **Always Embed AND Provide Clickable Links**: When a tool returns a generated image path, provide BOTH an embedded markdown image (`![Generated Image](file:///...)`) AND a clickable markdown link `[filename](file:///...)` so the user can easily open it.

---

## Core Tools Reference

### 1. Engine Diagnostic & Control
- **`mythic_status`**: Probes the local server (`http://localhost:3488`) and the BEI extension bridge (`http://127.0.0.1:58925`). Reports server status, connected Chrome tabs, discovered Google/ChatGPT accounts, and active generation slots.
- **`mythic_launch_server`**: Automatically launches the MythicFrame server in the background if `mythic_status` reports it is offline.
- **`mythic_open_tab`**: Focuses or opens Google Gemini or ChatGPT in Chrome via BEI if the user needs to log in.

### 2. Image Generation Tools
- **`mythic_bei_generate`**: Generates an image via BEI through Chrome. Parameters: `prompt`, `aspectRatio` ('1:1', '16:9', '9:16', '3:4', '4:3'), `target` ('gemini' | 'chatgpt'), `accountSlot`, `images` (visual references), `style`, `timeoutSeconds`.
- **`mythic_smart_generate`**: Unified generator. Automatically checks available engines:
  - If BEI is connected with an active tab, generates via BEI (zero-key).
  - If a Gemini API key is configured, generates via Gemini Imagen 3.
  - If neither is available, returns actionable guidance on opening Chrome or supplying a key.
- **`prepare_illustration_prompt`**, **`prepare_clothes_prompt`**, **`prepare_map_grid_prompt`**, etc.: Optimized prompt builders for specific game asset pipelines.

---

## Interactive User Guidance & Slash Commands

### `/mf-bei [prompt]`
1. Check `mythic_status`.
2. If server is offline, call `mythic_launch_server`.
3. If BEI has no active Gemini tab, use `ask_question` to ask the user if they'd like to open the tab now via `mythic_open_tab`.
4. Call `mythic_bei_generate`.

### `/mf-gen [prompt]`
1. Check `mythic_status`.
2. If both BEI and API key are available, or if the user makes an ambiguous request, use `ask_question`:
   - *(Recommended) BEI Bridge (Zero API Key - uses active Chrome Gemini account)*
   - *Gemini API Key (Imagen 3 direct API)*
   - *Prompt Only (Optimize prompt for copy-paste)*
3. Call `mythic_smart_generate` with the selected option.

---

## Advanced Generation Wizard
If the user asks for "advanced mode" or makes a vague request:
Use `ask_question` to let the user pick:
- **Aspect Ratio**: 1:1, 16:9, 9:16, 3:4, 4:3
- **Art Style**: Anime/Manga, Arknights Style, Cyberpunk, Dark Fantasy, 2D Pixel Art, No Style
- **Background Mode**: AI Decides, Solid, Transparent, Scene
- **Chibi Mode**: Enable / Disable
Pass all gathered options into `mythic_bei_generate` or `mythic_smart_generate`!
