# Prompt Helper Templates

## Style Analysis
**Input:** Reference image(s).
**Goal:** Extract a style description and a reusable prompt snippet.
**Prompt:**
"Analyze this reference image for visual style.
Respond with a JSON object containing:
- "description": a human-readable summary (2-4 sentences)
- "promptSnippet": a concise prompt tail describing rendering style, palette, and mood."

## Prompt Suggestions (Inspire Me)
**Input:** Current prompt text.
**Goal:** Suggest 3 creative additions.
**Prompt:**
"Based on the user's current art prompt: "{{CURRENT_PROMPT}}",
suggest 3 creative, short additions or refinements to make the image more interesting or detailed for a card game.
If the prompt is empty, suggest 3 diverse cool fantasy/sci-fi concepts.
Keep suggestions concise (under 10 words each).
Return a JSON array of strings."
