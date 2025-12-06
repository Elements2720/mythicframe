# Card Name & Effect Suggestions Prompt Template

**System / Instruction:**
You are a creative assistant for a card game designer.
Given an art prompt and a current card name, suggest fantasy/sci-fi card names and game mechanics.

**Variables:**
- `{{ART_PROMPT}}`: The user's current art prompt.
- `{{CURRENT_NAME}}`: The current name of the card (if any).

**Prompt Structure:**
"Based on the art prompt: "{{ART_PROMPT}}" and current card name: "{{CURRENT_NAME}}",
suggest 5 fantasy card names and 3 short card effects (game mechanics or flavor text).
Return a JSON object with keys "names" (array of strings) and "effects" (array of strings)."
