---
name: browser-social-publisher
description: >-
  Automate social media publishing across X (Twitter), Bluesky, LinkedIn, and Facebook
  using Playwright connected over Chrome DevTools Protocol (CDP) to an active
  Brave browser instance. Handles media uploads, form submissions, and automated
  first-comment link placement without port collisions.
---

# Browser Social Media Publishing Automation

This skill documents how to safely automate social media publishing to active browser sessions using Playwright over Chrome DevTools Protocol (CDP).

---

## 1. Browser Architecture & Port Isolation

To prevent conflicts with Google Chrome or system background processes (which default to port `9222`), always run Brave on a dedicated port:

- **Brave CDP Port**: `9223`
- **Launch Command**:
  ```powershell
  & "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9223
  ```

---

## 2. Playwright Core Connection

Use `playwright-core` to connect directly to the existing browser session:

```javascript
import { chromium } from 'playwright-core';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const context = browser.contexts()[0];
```

### Essential Navigation Guardrails
- **SPAs & Dynamic Sites**: Avoid default `page.goto(url)` without options. LinkedIn, X, and Facebook stream background telemetry that can cause 30-second navigation timeouts.
- **Safe Navigation Option**: Always specify `{ waitUntil: 'domcontentloaded' }`.

---

## 3. Platform-Specific Publishing Workflows

### A. Bluesky (`bsky.app`)
1. **Target**: Locate tab matching `bsky.app`.
2. **Modal Check**: Check if `div[role="dialog"]` is already open before clicking "New Post".
3. **Editor**: Click `div[role="dialog"] div[contenteditable="true"]` and type text.
4. **Attach Media**: Use `input[type="file"]` with `path.resolve(...)`.
5. **Publish**: Click `button:has-text("Publish")` or `button[aria-label="Publish post"]`.
6. **First Reply**:
   - Locate user's recent posts or newly created post.
   - Click reply icon (`button[data-testid="replyBtn"]`).
   - Type first reply text and submit.

---

### B. X / Twitter (`x.com`)
1. **Target**: Locate tab matching `x.com`.
2. **Editor**: `div[data-testid="tweetTextarea_0"]`.
3. **Attach Media**: `input[data-testid="fileInput"]` or `input[type="file"]`.
4. **Publish**: Click `button[data-testid="tweetButtonInline"]`.
5. **First Reply**:
   - Navigate to profile (`https://x.com/[handle]`).
   - Locate top tweet `article[data-testid="tweet"]`.
   - Click `button[data-testid="reply"]`.
   - In dialog, type first comment into `div[data-testid="tweetTextarea_0"]`.
   - Click `button[data-testid="tweetButton"]`.

---

### C. LinkedIn (`linkedin.com`)
1. **Target**: Locate tab matching `linkedin.com`.
2. **Attach Media**:
   - Click `button[aria-label="Media"]`.
   - Listen for `filechooser` event via `page.waitForEvent('filechooser')`.
   - Provide file paths.
   - Click "Next" on the media preview modal.
3. **Editor**: `div.editor-content div.ql-editor` or `div[role="textbox"]`.
4. **Publish**: Click `button.share-actions__primary-action, button:has-text("Post")`.
5. **First Comment**:
   - Navigate to `https://www.linkedin.com/in/[username]/recent-activity/all/` with `{ waitUntil: 'domcontentloaded' }`.
   - Locate top post in `main` and click `button:has-text("Comment")`.
   - Type comment into `div.comments-comment-box div[role="textbox"]`.
   - Click submit button `button:has-text("Comment")`.

---

### D. Facebook (`facebook.com`)
1. **Target**: Locate tab matching `facebook.com`.
2. **Open Composer**: Click `div[role="button"]:has-text("What's on your mind?")`.
3. **Attach Media**:
   - Inside `div[role="dialog"]`, click `div[role="button"][aria-label="Photo/video"]`.
   - Upload via `dialog.locator('input[type="file"]').setInputFiles([...])`.
4. **Post Text**: Focus `div[role="dialog"] div[role="textbox"]` and type text.
5. **Submit**: Click "Next", then click "Post" in the confirmation step.
6. **First Comment**:
   - Refresh the profile/feed page with `{ waitUntil: 'domcontentloaded' }`.
   - Locate the top post's comment box `div[role="textbox"][aria-label*="comment"]`.
   - Type first comment and press `Enter`.

---

## 4. Automation Best Practices

1. **Dry-Run & Inspection**: Always run small inspection scripts to verify DOM locators before executing full submissions.
2. **Sequential Execution**: Publish one platform at a time to prevent focus interference between browser tabs.
3. **Cleanup**: Remove all temporary `scratch_*.mjs` scripts immediately upon task completion.
