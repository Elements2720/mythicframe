# Contributing to MythicFrame

Thank you for your interest in contributing to MythicFrame! 

MythicFrame is an open-source, non-commercial 2D game asset creation studio. We welcome contributions that improve developer experience, bug fixes, UI enhancements, and new generative workflows.

---

## 📜 Non-Commercial License Requirement

By contributing to MythicFrame, you agree that your contributions will be licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). 
* All code, documentation, and assets submitted must be free of commercial restrictions and available for non-commercial open-source use.
* No proprietary, commercial, or closed-source code may be merged into this repository.

---

## 🔒 Security & Privacy Rules

To protect the safety of all contributors and users, pull requests must strictly follow these rules:
1. **Zero Hardcoded Secrets**: Never commit real API keys, bearer tokens, passwords, personal emails, or sensitive filesystem paths.
2. **Environment Variable Protection**: All secrets must be referenced via environment variables or browser `localStorage`.
3. **No Circumvention Exploits**: Do not submit code designed to bypass paywalls, exploit external security controls, or violate third-party Terms of Service.
4. **Local Execution**: All studio communications must remain on local loopback (`127.0.0.1` / `localhost`). Do not add external tracking telemetry, ad scripts, or remote logging.

---

## 🛠️ Local Development & Testing

1. **Clone the repository:**
   ```bash
   git clone https://github.com/VioleGracex/mythicframe.git
   cd mythicframe
   npm install
   ```

2. **Start the local server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3488` in your browser.

3. **Verify Type Safety & Production Build:**
   Before submitting a Pull Request, always verify that your code compiles cleanly:
   ```bash
   npx tsc --noEmit
   npm run build
   ```

4. **Browser Extension (`bei-extension`) Versioning & Changelog Rule:**
   Whenever modifying any file inside `bei-extension/` (scripts, manifest, background worker, or protocols):
   - **Bump the extension version** in `bei-extension/manifest.json` following semantic versioning (`MAJOR.MINOR.PATCH`).
   - Synchronize the `extensionVersion` constant in `src/server/beiBridge.ts`.
   - Update `bei-extension/INSTALLATION_AND_USAGE_GUIDE.md` to reference the new version.
   - Record the changes in `CHANGELOG.md` and `devlog/DEVLOG.md` (Forge Mode log).
   - This ensures users know when to click **Reload (🔄)** in `chrome://extensions`.

---

## 📋 Pull Request Guidelines

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-enhancement
   ```
2. **Write clear commit messages:** Follow conventional commits (e.g., `feat:`, `fix:`, `docs:`, `refactor:`).
3. **Keep changes focused:** Avoid unrelated modifications across multiple files in a single PR.
4. **Submit your PR** with a clear explanation of what was changed and why.
