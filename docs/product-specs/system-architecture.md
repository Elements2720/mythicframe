# System Architecture

## Frontend
- **Framework**: React 18+ (SPA)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks / Local State (scaling to Context/Zustand)

## Backend / API
- **Gemini Integration**: Direct calls via `@google/genai` SDK.
- **Models**:
  - `gemini-3-pro-image-preview` (High-fidelity generation)
  - `gemini-2.5-flash-image` (Fast generation & editing)
  - `gemini-3-pro-preview` (Vision/Analysis)

## Data Models
- **Project**: Container for a set of cards.
- **GameContext**: 
  - `setting`: The world description (e.g., "Cozy alchemy shop").
  - `tone`: The mood (e.g., "Whimsical, warm").
  - `visualConstraints`: Rules (e.g., "No sci-fi elements").
- **Card**: Instance of a card design.
- **StyleProfile**: Saved style prompt fragments.
- **HistoryEntry**: Record of past generations.

## Modular Code Organization
- **UI Components**: `PreviewCanvas`, `PromptPanel`, `HistoryPanel`, `ExportDialog`.
- **Services**: `geminiService` (API), `historyService` (Persistence), `exportService` (Zip/Image).
- **Prompt Management**: `docs/ai-prompts/` is the source of truth.

## Development Workflow
1. **Docs First**: Update `docs/implementation-tasks/` before coding.
2. **Modular**: Keep components small and specialized.
3. **Priorities**: Illustration Mode > UI Polish > New Features.