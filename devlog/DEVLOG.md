# MythicFrame Development Log (Forge Mode)

All engineering iterations, releases, and architecture milestones are recorded below in reverse chronological order.

---

## [1.5.9] — Multi-Account Tab Dispatch, Settings Tab Refactoring & BEI v1.4.1
Date: 2026-10-10 | Time: ~30 min

### Added
- **Multi-Account Parallel Tab Dispatch**: Auto-balances and routes generation requests across idle logged-in Google account slots (`/u/0` - `/u/3`) when primary tab/slot is busy.
- **Agent Preference Inquiries**: User can choose between single account vs multi-tab parallel, with "Remember Choice" or "Ask on Each One".
- **Tabbed Settings Page Refactoring**: Divided `Settings.tsx` into 3 losslessly preserved tabs (`AI Generation Engines`, `Game Context`, and `Google Drive`), drastically improving UI cleanliness.
- **In-App Dialog Engine**: Migrated all 20+ browser `alert()`, `confirm()`, and `prompt()` calls into an elegant in-app modal system (`InAppDialogModal.tsx`, `dialogService.ts`).
- **Biomechanical Motion Constraints**: Created `poseConstraints.ts` enforcing anatomical bone distance constraints, elbow/knee angles, and 2-bone analytical IK.
- **Zero-Latency Pose Dragging**: Rebuilt Pose Studio drag engine using `requestAnimationFrame`, local joint state, and native drag prevention (`e.preventDefault()`).

### Changed
- **BEI Chrome Extension**: Bumped version to `v1.4.1` across `manifest.json`, `beiBridge.ts`, and installation guides.
- **Extension Background Worker**: Added parallel idle slot routing in `EXECUTE_PROMPT` for `dispatchMode === 'multi'`.

### Files Affected
- `bei-extension/manifest.json`
- `bei-extension/background.js`
- `bei-extension/INSTALLATION_AND_USAGE_GUIDE.md`
- `src/types.ts`
- `src/services/beiService.ts`
- `src/components/views/Settings.tsx`
- `src/server/beiBridge.ts`
- `src/mcp/index.ts`
- `src/mcp/beiClient.ts`
- `.gemini/skills/mf-bei/SKILL.md`
- `.gemini/skills/mf-gen/SKILL.md`
- `package.json`
- `CHANGELOG.md`
- `devlog/DEVLOG.md`

---

## [1.5.8] — BEI Download Quality Control & Extension v1.4.0
Date: 2026-10-10 | Time: ~35 min

### Added
- Multi-tier image download quality system (`ultra_original`, `high`, `standard`) across UI, MCP tools, and extension.
- AI Agent Prompting preference toggle (`Remember Choice` vs `Ask on Each One`).
- Contributor guideline in `CONTRIBUTING.md` enforcing version bumps whenever modifying `bei-extension/`.
- Cross-platform automated launcher scripts (`launch.bat`, `launch.sh`).

### Changed
- **BEI Chrome Extension**: Bumped version `1.3.6` → `1.4.0` in `manifest.json`, `beiBridge.ts`, and guide docs.
- **Image Extraction Logic**: `protocol.js` transforms Google CDN URLs to `=s0` (uncompressed original) and attempts authenticated full-res blob fetch before falling back to canvas capture.
- **MCP Tool Definitions**: `mythic_bei_generate` and `mythic_smart_generate` schemas accept and forward `quality`.

### Fixed
- Low quality downloads where BEI previously saved downsampled viewport canvas captures (~150 KB, 572x1024) instead of the original master image asset.

### Files Affected
- `bei-extension/manifest.json`
- `bei-extension/scripts/protocol.js`
- `bei-extension/scripts/gemini_content.js`
- `bei-extension/background.js`
- `bei-extension/INSTALLATION_AND_USAGE_GUIDE.md`
- `src/types.ts`
- `src/services/beiService.ts`
- `src/components/views/Settings.tsx`
- `src/server/beiBridge.ts`
- `src/mcp/index.ts`
- `src/mcp/beiClient.ts`
- `.gemini/skills/mf-bei/SKILL.md`
- `.gemini/skills/mf-gen/SKILL.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `devlog/DEVLOG.md`

---

## [1.5.7] — Account Priority Queue & Anti-Throttling (BEI v1.3.6)
Date: 2026-10-10

### Added
- Account priority queue with drag-and-drop order and automatic failover on quota exhaustion.
- Fake Active Mode and dedicated window group defaults to avoid Chromium background throttling.
- `RELOAD_EXTENSION` RPC endpoint on BEI bridge port 58925.

---

## [1.5.6] — Stalled Job Recovery & Modal Dismissal (BEI v1.3.5)
Date: 2026-10-10

### Added
- Auto-retry refetch loop and preserved job context across tab reconnects.
- Universal dismiss for consent and promotional modal dialogs in Gemini Web.

### Fixed
- False positive text extraction in `gemini_content.js`.

---

## [1.5.5] — Payload Diagnostics & ServiceWorker Fix (BEI v1.3.3)
Date: 2026-10-10

### Added
- Live BEI Payload Diagnostics modal in UI.
- Graceful server shutdown / quit button in Dashboard header.

### Fixed
- ServiceWorker `FileReader` crash in `background.js`.

---

## [1.5.4] — Multi-Slot Dynamic Accounts (BEI v1.3.2)
Date: 2026-10-10

### Added
- Multi-slot Google account discovery (`/u/0` through `/u/3`).
- Immediate tab grouping and foreground window focus synchronization.

---

## [1.5.3] — Animation Strip Studio & Batch Updates
Date: 2026-10-10

### Added
- Animation Strip Studio with frame sequencer.
- Zip batch download improvements.
- Generation heartbeats to prevent premature timeouts.

---

## [1.5.1] — Reference Uploads & Incognito Mode
Date: 2026-10-09

### Added
- MCP server and AI skills (`/mf-bei`, `/mf-gen`).
- Incognito / Streamer Mode email masking.
- Visual "Create image" tag injection in Gemini composer.

### Fixed
- Reference image attachment leakage between turns.

---

## [1.5.0] — Initial BEI Launch (Zero-Key Browser Extension Interface)
Date: 2026-10-09

### Added
- Initial release of BEI Chrome extension and local bridge (port 58925).
- PolyForm Noncommercial License 1.0.0.

---

## [1.4.1] — Canvas Optimizations & Asset Pipeline
Date: 2026-05-27

---

## [0.8.2-beta] — Gacha Card Canvas & Illustration Generator
Date: 2025-12-26

---

## [0.4.2] — Prototype Studio
Date: 2025-12-08
