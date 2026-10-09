/**
 * MythicFrame BEI Bridge - Gemini Web Content Script
 * Injected into https://gemini.google.com/*
 * Resilient against context reloads, tab navigation, and service worker restarts.
 */

(() => {
  const protocol = globalThis.__MYTHIC_BEI__ || {
    extractGeminiAccountSlot: () => 0,
    isGeneratedImage: (img) => img && (img.src || '').includes('googleusercontent.com'),
    imageToBase64: async (img) => img.src,
    fetchBlobAsBase64: async (url) => url
  };

  console.log(`[MythicFrame BEI] Gemini content script attached to slot /u/${protocol.extractGeminiAccountSlot(window.location.href)}/`);

  const COMPOSER_SELECTORS = [
    "rich-textarea div[contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
    "rich-textarea p",
    "div[contenteditable='true']",
    "textarea[aria-label*='prompt' i]",
    "textarea"
  ];

  const SEND_BUTTON_SELECTORS = [
    "button[aria-label*='Send' i]",
    "button[aria-label*='Submit' i]",
    "button.send-button",
    "[data-test-id='send-button']",
    "button.mat-mdc-icon-button[aria-label*='Send' i]"
  ];

  const GEMINI_REFUSAL_PATTERNS = [
    /cannot generate/i,
    /unable to generate/i,
    /violates our safety/i,
    /violates safety/i,
    /content policy/i,
    /against our policies/i,
    /against my policies/i,
    /against our safety/i,
    /safety guidelines/i,
    /i am unable to create/i,
    /i'm unable to create/i,
    /i cannot create/i,
    /can't create an image/i,
    /can't generate/i,
    /i'm unable to fulfill/i,
    /i cannot fulfill/i,
    /i am sorry, but i cannot/i,
    /i'm sorry, but i cannot/i,
    /not allowed to generate/i,
    /i am unable to assist with/i,
    /safety reasons/i,
    /restricted content/i
  ];

  const GEMINI_RATE_LIMIT_PATTERNS = [
    /reached your daily limit/i,
    /rate limit exceeded/i,
    /try again later/i,
    /exceeded your limit/i,
    /exceeded your quota/i,
    /usage limit reached/i,
    /daily limit reached/i,
    /limit reached/i,
    /too many requests/i,
    /temporarily unavailable/i
  ];

  const GEMINI_CANCELLATION_PATTERNS = [
    /response generation stopped/i,
    /generation stopped/i,
    /generation was stopped/i,
    /response was stopped/i,
    /stopped generating/i,
    /stopped response/i
  ];

  const STOP_BUTTON_SELECTORS = [
    "button[aria-label*='Stop' i]",
    "button[data-test-id*='stop']",
    "button[mattooltip*='Stop' i]",
    "button.stop-button",
    ".stop-response-button",
    "[aria-label*='Stop response' i]",
    "[aria-label*='Stop generation' i]"
  ];

  function isStopButtonElement(target) {
    if (!target) return false;
    const btn = target.closest(STOP_BUTTON_SELECTORS.join(', '));
    if (btn) return true;
    const anyBtn = target.closest('button, [role="button"]');
    if (anyBtn) {
      const aria = (anyBtn.getAttribute('aria-label') || '').toLowerCase();
      const tooltip = (anyBtn.getAttribute('mattooltip') || '').toLowerCase();
      const text = (anyBtn.innerText || anyBtn.textContent || '').trim().toLowerCase();
      if (aria.includes('stop') || tooltip.includes('stop') || text === 'stop' || text === 'stop response') {
        return true;
      }
      const icon = anyBtn.querySelector('mat-icon, svg, i');
      if (icon) {
        const iconName = (icon.getAttribute('fonticon') || icon.getAttribute('data-mat-icon-name') || '').toLowerCase();
        if (iconName.includes('stop')) return true;
      }
    }
    return false;
  }

  let activeRunningJobId = null;
  let activeCancelHandler = null;

  // Capture phase listener to detect direct user clicks on Stop response button in Gemini Web
  document.addEventListener('click', (event) => {
    if (!activeRunningJobId || typeof activeCancelHandler !== 'function') return;
    if (isStopButtonElement(event.target)) {
      console.log(`[MythicFrame BEI] Detected user click on Stop button in Gemini Web! Job: ${activeRunningJobId}`);
      activeCancelHandler('User clicked Stop response button in Gemini Web');
    }
  }, true);

  function getComposerElement() {
    for (const sel of COMPOSER_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      } catch (e) {}
    }
    return null;
  }

  function getSendButton() {
    for (const sel of SEND_BUTTON_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true') {
          return el;
        }
      } catch (e) {}
    }
    return null;
  }

  function setComposerText(composer, text) {
    if (!composer) return false;
    try {
      composer.focus();

      // Method A: Native execCommand 'insertText' onto selected node contents
      // This is the cleanest way in Chromium for Angular contenteditable rich-textarea
      // because it emits native BeforeInput and Input events that Angular listens to!
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(composer);
        selection.removeAllRanges();
        selection.addRange(range);
        const success = document.execCommand('insertText', false, text);
        const currentLen = (composer.innerText || composer.textContent || '').trim().length;
        if (success && currentLen > 0) {
          composer.dispatchEvent(new Event('input', { bubbles: true }));
          composer.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      } catch (e) {}

      // Method B: Contenteditable paragraph replacement + synthetic InputEvents
      if (composer.tagName && composer.tagName.toLowerCase() === 'textarea') {
        composer.value = text;
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        composer.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        composer.innerHTML = '';
        const lines = text.split('\n');
        for (const line of lines) {
          const p = document.createElement('p');
          p.textContent = line || '\u00A0';
          composer.appendChild(p);
        }
        try {
          composer.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        } catch (e) {}
        try {
          composer.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        } catch (e) {}
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        composer.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return (composer.innerText || composer.textContent || composer.value || '').trim().length > 0;
    } catch (err) {
      console.warn('[MythicFrame BEI] setComposerText error:', err);
      return false;
    }
  }

  function isCreateImageTagActive() {
    try {
      const candidates = Array.from(document.querySelectorAll(
        'mat-chip, mat-chip-row, [role="button"], [class*="tag"], [class*="chip"], [data-tool-id*="image" i], [aria-label*="Create image" i], [aria-label*="Remove Create image" i], .tool-chip, [data-test-id*="tool"]'
      ));
      return candidates.some(c => {
        // Exclude elements inside open or closed popup menus
        if (c.closest('[role="menu"], .cdk-overlay-pane, mat-menu, gem-menu')) return false;

        const text = (c.textContent || '').trim().toLowerCase();
        const aria = (c.getAttribute('aria-label') || '').toLowerCase();

        // Must be inside or near composer / input container or bottom container
        const isNearComposer = c.closest('.input-area, .chat-input-container, .bottom-container, rich-textarea, form, main');
        if (!isNearComposer && !aria.includes('create image')) return false;

        return text.includes('create image') || text === 'image' || text === 'imagen' ||
               aria.includes('create image') || aria.includes('remove create image');
      });
    } catch (e) {
      return false;
    }
  }

  async function ensureCreateImageMode(jobId = null) {
    try {
      if (isCreateImageTagActive()) {
        console.log('[MythicFrame BEI] "Create image" tool mode already active in composer.');
        return true;
      }

      // 1. Helper to find "Create image" inside any open Angular/CDK menu or overlay
      const findCreateImageItem = () => {
        const items = Array.from(
          document.querySelectorAll('.gem-menu-item-label, [role="menuitem"], gem-menu-item, .mat-mdc-menu-item, button, div, span')
        );
        return items.find(el => {
          const inMenu = el.closest('[role="menu"], .cdk-overlay-pane, mat-menu, gem-menu, [role="menuitem"]');
          if (!inMenu) return false;
          const text = (el.textContent || '').trim().toLowerCase();
          const aria = (el.getAttribute('aria-label') || '').toLowerCase();
          return text === 'create image' || text.startsWith('create image') ||
                 aria === 'create image' || aria.startsWith('create image');
        });
      };

      let target = findCreateImageItem();

      // 2. If menu is closed, find and click the '+' (Upload & tools) button
      if (!target) {
        const plusSelectors = [
          'button[aria-label*="Upload" i]',
          'button[aria-label*="tools" i]',
          'button[aria-label*="Add" i]',
          'button[aria-label*="Attach" i]',
          'button[aria-label*="tools and content" i]',
          'gem-icon-button button',
          'button[aria-haspopup="menu"]',
          '[data-test-id*="tools-button"]',
          '[data-test-id*="upload-button"]',
          'button.input-area-button',
          '.input-area button[aria-haspopup="menu"]',
          '.chat-input-container button[aria-haspopup="menu"]',
          'button:has(mat-icon[fonticon="add"])',
          'button:has(mat-icon[data-mat-icon-name="add"])',
          'mat-icon[fonticon="add"]',
          'mat-icon[data-mat-icon-name="add"]',
          'button[mattooltip*="Upload" i]',
          'button[mattooltip*="tools" i]',
          'button[mattooltip*="Add" i]'
        ];

        let plusButton = null;
        for (const sel of plusSelectors) {
          const candidates = Array.from(document.querySelectorAll(sel));
          for (const btn of candidates) {
            if (btn.closest('header, nav, [role="navigation"], [aria-label*="Google Account" i], bard-user-menu, .gb_d')) continue;
            if (btn.closest('.bottom-container, .input-area, .chat-input-container, form, rich-textarea, main') || btn.querySelector('mat-icon[fonticon="add"], mat-icon[fonticon="upload"]')) {
              plusButton = btn;
              break;
            }
          }
          if (plusButton) break;
        }

        if (plusButton) {
          console.log('[MythicFrame BEI] Clicking "+" tools button in composer...');
          const clickableBtn = plusButton.closest('button') || plusButton;
          ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
            clickableBtn.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true }));
          });
          clickableBtn.click();

          // Poll Angular CDK overlay for "Create image" menu item (up to 1500ms)
          for (let i = 0; i < 30; i++) {
            await new Promise(res => setTimeout(res, 50));
            target = findCreateImageItem();
            if (target) break;
          }
        }
      }

      // 3. Click the menu item and dispatch full event sequence to notify Angular
      if (target) {
        const clickable = target.closest('button, [role="menuitem"], gem-menu-item, .mat-mdc-menu-item') || target;
        console.log('[MythicFrame BEI] Found "Create image" menu item. Dispatching click...');
        ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
          clickable.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true }));
        });
        clickable.click();
        console.log('✅ [MythicFrame BEI] "Create image" tag activated in Gemini Web!');
        if (jobId) reportProgress(jobId, 'create_image_mode', '"Create image" tool tag activated in Gemini Web.');
        await new Promise(res => setTimeout(res, 350));
        return isCreateImageTagActive() || true;
      } else {
        console.warn('[MythicFrame BEI] Angular "Create image" menu option not visible in overlay.');
      }
    } catch (e) {
      console.debug('[MythicFrame BEI] Auto-select Create Image notice:', e);
    }
    return isCreateImageTagActive();
  }

  function clearComposer() {
    try {
      // 1. Remove attachment preview chips (protecting any active 'Create image' tool tag!)
      const closeButtons = Array.from(document.querySelectorAll(
        "button[aria-label*='Remove' i], button[aria-label*='Clear' i], button[aria-label*='Delete' i], [aria-label*='remove attachment' i], [aria-label*='remove file' i], .attachment-card button, [data-test-id*='attachment'] button, button.delete-button, button.close-button, [aria-label*='dismiss' i]"
      )).filter(btn => {
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = (btn.textContent || '').toLowerCase();
        const chipText = (btn.closest('mat-chip, mat-chip-row, [class*="chip"]') || {}).textContent || '';
        // NEVER dismiss the "Create image" tool tag!
        if (aria.includes('create image') || text.includes('create image') || chipText.toLowerCase().includes('create image')) {
          return false;
        }
        return true;
      });

      for (const btn of closeButtons) {
        try {
          if (btn.tagName && btn.tagName.toLowerCase() === 'mat-icon' && btn.parentElement) {
            btn.parentElement.click();
          } else {
            btn.click();
          }
        } catch (e) {}
      }

      // Also trigger remove buttons inside attachment cards (excluding tool tags)
      const chips = Array.from(document.querySelectorAll(
        "[data-test-id*='attachment'], [data-test-id*='file'], .attachment-card, [class*='uploader-preview'], [class*='file-preview']"
      ));
      for (const chip of chips) {
        const chipContent = (chip.textContent || '').toLowerCase();
        if (chipContent.includes('create image')) continue;
        const btn = chip.querySelector('button, [role="button"]');
        if (btn) {
          try { btn.click(); } catch (e) {}
        }
      }

      // 2. Clear all file inputs and reset their state
      const fileInputs = document.querySelectorAll("input[type='file']");
      for (const input of fileInputs) {
        try {
          input.value = '';
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {}
      }

      // 3. Clear composer text
      const composer = getComposerElement();
      if (composer) {
        composer.focus();
        if (composer.tagName.toLowerCase() === 'textarea') {
          composer.value = '';
          composer.dispatchEvent(new Event('input', { bubbles: true }));
          composer.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          composer.innerHTML = '';
          composer.textContent = '';
          const p = document.createElement('p');
          composer.appendChild(p);
          composer.dispatchEvent(new Event('input', { bubbles: true }));
          composer.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      // 4. If generation is actively running, halt it by clicking the Stop button
      const stopButtons = Array.from(document.querySelectorAll(
        "button[aria-label*='Stop' i], button[data-test-id*='stop'], button.stop-button, [aria-label*='Stop response' i], [aria-label*='Stop generating' i]"
      ));
      for (const btn of stopButtons) {
        try {
          btn.click();
          console.log('[MythicFrame BEI] Clicked Gemini Stop response button.');
        } catch (e) {}
      }
      console.log('[MythicFrame BEI] Gemini composer wiped clean.');
    } catch (e) {
      console.warn('[MythicFrame BEI] Error clearing composer:', e);
    }
  }

  function reportProgress(jobId, step, detail) {
    if (!jobId) return;
    try {
      console.log(`[MythicFrame BEI Progress] [${step}] ${detail}`);
      chrome.runtime.sendMessage({
        type: 'GENERATION_PROGRESS',
        data: {
          jobId,
          step,
          detail,
          timestamp: Date.now()
        }
      });
    } catch (e) {}
  }

  function clearOldAttachments() {
    try {
      const composer = getComposerElement();
      const inputContainer = composer ? (composer.closest('.bottom-container, .input-area, .chat-input-container, form, main') || document.body) : document.body;
      const removeButtons = Array.from(inputContainer.querySelectorAll(
        'button[aria-label*="Remove" i], button[aria-label*="Clear" i], button[aria-label*="Delete" i], [aria-label*="remove attachment" i], [aria-label*="remove file" i], [aria-label*="remove image" i]'
      )).filter(el => !el.closest('header, nav, [role="navigation"]'));
      for (const btn of removeButtons) {
        try { btn.click(); } catch (e) {}
      }
    } catch (e) {}
  }

  function autoDismissConsentDialogs() {
    try {
      // 1. Check all modals and overlay panes
      const dialogs = document.querySelectorAll(
        '[role="dialog"], [role="alertdialog"], mat-dialog-container, .cdk-overlay-pane, div.modal, .tos-dialog, mat-bottom-sheet-container, .banner, [class*="consent"], [class*="dialog"]'
      );
      for (const dialog of dialogs) {
        const buttons = Array.from(dialog.querySelectorAll('button, [role="button"], a.button'));
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase();
          const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
          if (
            text.includes('agree') || text.includes('got it') || text.includes('accept') ||
            text.includes('understand') || text.includes('continue') || text.includes('confirm') ||
            text.includes('allow') || text.includes('acknowledge') || text === 'ok' || text === 'yes' ||
            aria.includes('agree') || aria.includes('accept') || aria.includes('got it') || aria.includes('confirm')
          ) {
            console.log('[MythicFrame BEI] Auto-clicked consent/terms dialog button:', text || aria);
            btn.click();
            return true;
          }
        }
      }

      // 2. Global search for any visible consent/agreement button
      const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
      for (const btn of allButtons) {
        if (btn.offsetParent === null) continue;
        const text = (btn.textContent || '').trim().toLowerCase();
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (
          text === 'i agree' || text === 'agree' || text === 'got it' || text === 'accept' ||
          text === 'i understand' || text === 'understand' || text === 'confirm' ||
          aria === 'i agree' || aria === 'agree' || aria === 'got it' || aria === 'accept'
        ) {
          console.log('[MythicFrame BEI] Auto-clicked global consent button:', text || aria);
          btn.click();
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function findGeminiFileInput() {
    const composer = getComposerElement();
    const candidateContainers = [
      composer?.closest('rich-textarea')?.parentElement,
      composer?.closest('.input-area'),
      composer?.closest('.chat-input-container'),
      composer?.closest('.bottom-container'),
      composer?.closest('form'),
      document.querySelector('.input-area'),
      document.querySelector('.chat-input-container'),
      document.querySelector('.bottom-container'),
      document.querySelector('main')
    ].filter(Boolean);

    for (const container of candidateContainers) {
      const inputs = container.querySelectorAll("input[type='file']");
      for (const input of inputs) {
        if (!input.closest('header, nav, [role="navigation"], bard-user-menu, .gb_d, [href*="myaccount.google.com"], [aria-label*="Google Account" i]')) {
          return input;
        }
      }
    }

    const allInputs = Array.from(document.querySelectorAll("input[type='file']"));
    for (const input of allInputs) {
      if (input.closest('header, nav, [role="navigation"], bard-user-menu, .gb_d, [href*="myaccount.google.com"], [aria-label*="Google Account" i]')) {
        continue;
      }
      const name = (input.getAttribute('name') || '').toLowerCase();
      if (name === 'filedata') continue;
      return input;
    }
    return null;
  }

  async function waitForAttachmentUploadComplete(expectedCount = 1, maxWaitMs = 150000, jobId = null) {
    const startTime = Date.now();
    let consecutiveReadyChecks = 0;
    let errorStartTime = null;
    let lastProgressTime = Date.now();

    console.log(`[MythicFrame BEI] Waiting up to ${Math.round(maxWaitMs / 1000)}s for ${expectedCount} reference image(s) to finish uploading...`);
    if (jobId) reportProgress(jobId, 'verifying_upload', `Verifying reference image upload in Gemini Web...`);

    while (true) {
      autoDismissConsentDialogs();
      await new Promise(r => setTimeout(r, 400));

      const now = Date.now();
      const elapsed = now - startTime;

      const composer = getComposerElement();
      const inputContainer = composer ? (composer.closest('.bottom-container, .input-area, .chat-input-container, form, main') || composer.parentElement || document.body) : document.body;

      // 1. Look for attachment preview chips inside the input area
      const chips = Array.from(inputContainer.querySelectorAll(
        '[data-test-id*="attachment"], [data-test-id*="file"], mat-chip, mat-chip-row, .attachment-card, [class*="attachment"], [class*="uploader-preview"], [class*="file-preview"], [class*="image-preview"], [class*="thumbnail-wrapper"], [class*="media-preview"], [class*="preview-item"], xap-file-preview, xap-media-preview'
      )).filter(el => !el.closest('header, nav, [role="navigation"]'));

      const removeButtons = Array.from(inputContainer.querySelectorAll(
        'button[aria-label*="Remove" i], button[aria-label*="Clear" i], button[aria-label*="Delete" i], [aria-label*="remove attachment" i], [aria-label*="remove file" i], [aria-label*="remove image" i]'
      )).filter(el => !el.closest('header, nav, [role="navigation"]'));

      // 2. Check for active upload progress indicators ONLY within attachment chips or inputContainer
      // Exclude global page loaders, mic buttons, user avatars, headers, and navigation
      const progressIndicators = Array.from(inputContainer.querySelectorAll(
        'mat-progress-spinner, mat-spinner, mat-progress-bar, [role="progressbar"], .upload-progress, .uploading-spinner'
      )).filter(el => {
        if (el.closest('header, nav, [role="navigation"], bard-user-menu, .gb_d, speech-recognition, button[aria-label*="microphone" i]')) return false;
        return el.offsetParent !== null;
      });

      const isUploading = progressIndicators.length > 0;
      if (isUploading) {
        lastProgressTime = now;
        if (jobId) {
          const elapsedSec = Math.round(elapsed / 1000);
          reportProgress(jobId, 'uploading_references', `Transmitting reference image to Google media servers (${elapsedSec}s)...`);
        }
      }

      // 3. Check for error indicators in chips and retry if possible
      let hasError = false;
      for (const chip of chips) {
        const text = (chip.innerText || chip.textContent || '').toLowerCase();
        const hasErrorIcon = Boolean(chip.querySelector(
          'mat-icon[fonticon*="error"], mat-icon[fonticon*="warning"], mat-icon[fonticon*="report"], mat-icon[fonticon*="priority_high"], [aria-label*="error" i], [aria-label*="failed" i], svg[class*="error"], .error-badge, .error-icon'
        ));
        const hasErrorClass = chip.classList && (chip.classList.contains('error') || chip.classList.contains('failed') || chip.classList.contains('has-error'));
        if (hasErrorIcon || hasErrorClass || text.includes('failed') || text.includes('error') || text.includes('could not')) {
          hasError = true;
          const retryBtn = chip.querySelector('button[aria-label*="retry" i], button[title*="retry" i]');
          if (retryBtn) {
            console.log('[MythicFrame BEI] Retrying failed attachment in chip...');
            retryBtn.click();
          }
        }
      }

      if (hasError) {
        if (!errorStartTime) errorStartTime = now;
        if (now - errorStartTime > 15000) {
          console.warn('[MythicFrame BEI] Reference attachment upload rejected by Google Scotty. Aborting before timeout.');
          return false;
        }
      } else {
        errorStartTime = null;
      }

      // 4. Count loaded thumbnail images
      let thumbnailsReady = 0;
      for (const chip of chips) {
        const img = chip.querySelector('img');
        if (img && img.complete && (img.naturalWidth > 10 || (img.src || '').startsWith('blob:') || (img.src || '').startsWith('data:') || (img.src || '').includes('googleusercontent.com'))) {
          thumbnailsReady++;
        }
      }

      const composerImgs = Array.from(inputContainer.querySelectorAll('img')).filter(img => {
        if (img.closest('header, nav, [role="navigation"], bard-user-menu, .gb_d, button[aria-label*="account" i]')) return false;
        return img.complete && (img.naturalWidth > 10 || (img.src || '').startsWith('blob:') || (img.src || '').startsWith('data:') || (img.src || '').includes('googleusercontent.com'));
      });
      if (composerImgs.length > thumbnailsReady) {
        thumbnailsReady = composerImgs.length;
      }

      const hasIndicators = thumbnailsReady >= expectedCount || chips.length >= expectedCount || removeButtons.length >= expectedCount;

      // 5. Send button status check: If Send button is enabled, Gemini client-side validation confirms upload is complete!
      const sendBtn = getSendButton();
      const isSendActive = sendBtn !== null;

      // Ready when:
      // A) No spinner, no error, thumbnail or chip rendered, at least 1s elapsed
      // OR B) Send button is active + no error (Gemini's own client validation confirmed attachments are complete and enabled the button!)
      const isReadyState = (!isUploading && !hasError && elapsed >= 1000 && hasIndicators) ||
                           (isSendActive && !hasError && (hasIndicators || thumbnailsReady > 0 || elapsed >= 1200));

      if (isReadyState) {
        consecutiveReadyChecks++;
        if (consecutiveReadyChecks >= 2) {
          console.log(`[MythicFrame BEI] Reference image upload verified complete in ${elapsed}ms (${thumbnailsReady} thumbnail(s), ${chips.length} chip(s), sendActive: ${isSendActive})`);
          if (jobId) reportProgress(jobId, 'references_uploaded', `Reference image attached successfully (${elapsed}ms).`);
          await new Promise(r => setTimeout(r, 400));
          return true;
        }
      } else {
        consecutiveReadyChecks = 0;
      }

      // Dynamic Timeout Evaluation:
      const timeSinceLastProgress = now - lastProgressTime;
      if (elapsed > maxWaitMs && !isUploading && timeSinceLastProgress > 25000) {
        console.warn(`[MythicFrame BEI] Attachment upload wait reached timeout (${elapsed}ms, stalled for ${timeSinceLastProgress}ms).`);
        return false;
      }
      if (elapsed > 300000) {
        console.warn(`[MythicFrame BEI] Attachment upload reached absolute 5-minute safety ceiling.`);
        return false;
      }
    }
  }

  async function attachReferenceImages(images, composer, jobId = null, maxUploadWaitMs = 150000) {
    if (!images || images.length === 0) return true;
    try {
      clearOldAttachments();
      autoDismissConsentDialogs();

      if (jobId) reportProgress(jobId, 'uploading_references', `Uploading reference image(s) (1/${images.length})...`);

      const files = [];
      images.forEach((img, idx) => {
        const url = typeof img === 'string' ? img : img.url;
        if (url && url.startsWith('data:image/')) {
          const arr = url.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          let ext = 'png';
          if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
          else if (mime.includes('webp')) ext = 'webp';
          else if (mime.includes('gif')) ext = 'gif';
          const filename = `reference_${idx + 1}.${ext}`;
          files.push(new File([u8arr], filename, { type: mime, lastModified: Date.now() }));
        }
      });

      if (files.length === 0) return true;

      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));

      // Method 1: Find file input using robust locator
      let fileInput = findGeminiFileInput();
      if (fileInput) {
        try {
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[MythicFrame BEI] Attached references via scoped file input.');
        } catch (e) {
          console.debug('[MythicFrame BEI] File input assignment notice:', e);
        }
      }

      // Method 2: Multi-target HTML5 Drag & Drop sequence
      const dropTargets = [
        composer,
        composer.closest('rich-textarea') || composer,
        composer.closest('.input-area') || composer,
        composer.closest('.chat-input-container') || composer,
        composer.closest('form') || composer,
        document.querySelector('.input-area') || composer,
        document.querySelector('.chat-input-container') || composer,
        document.querySelector('rich-textarea') || composer,
        document.querySelector('main') || document.body
      ].filter(Boolean);

      for (const target of dropTargets) {
        try {
          target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
          target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
          target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        } catch (e) {}
      }
      console.log('[MythicFrame BEI] Dispatched Drag & Drop event sequence across composer targets.');

      // Method 3: ClipboardEvent paste on focused composer
      try {
        composer.focus();
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
        composer.dispatchEvent(pasteEvent);
      } catch (e) {}

      // Method 4: On-demand upload menu opening fallback if needed
      await new Promise(r => setTimeout(r, 600));
      autoDismissConsentDialogs();

      if (!fileInput) {
        const attachBtns = Array.from(document.querySelectorAll(
          "button[aria-label*='Add files' i], button[aria-label*='Add image' i], button[aria-label*='Upload image' i], button[aria-label*='Upload files' i], button[aria-label*='Upload file' i], button[aria-label*='Upload' i], button.uploader-button, [data-test-id*='upload-button'], [data-test-id*='add-file'], button[mattooltip*='Upload' i], button[mattooltip*='Add files' i]"
        )).filter(b => !b.closest('header, nav, [role="navigation"], [aria-label*="Google Account" i]'));

        for (const btn of attachBtns) {
          try {
            btn.click();
            await new Promise(r => setTimeout(r, 300));
            const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], button, .mat-mdc-menu-item'));
            const uploadItem = menuItems.find(m => {
              const text = (m.textContent || '').toLowerCase();
              return (text.includes('upload') || text.includes('file') || text.includes('computer')) && !text.includes('create image');
            });
            if (uploadItem) {
              uploadItem.click();
              await new Promise(r => setTimeout(r, 200));
            }
            break;
          } catch (e) {}
        }

        const freshInput = findGeminiFileInput();
        if (freshInput) {
          try {
            freshInput.files = dt.files;
            freshInput.dispatchEvent(new Event('input', { bubbles: true }));
            freshInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[MythicFrame BEI] Attached references via newly mounted file input.');
          } catch (e) {}
        }
      }

      console.log(`[MythicFrame BEI] Dispatched ${files.length} reference image(s) to Gemini. Monitoring upload...`);
      const uploadOk = await waitForAttachmentUploadComplete(files.length, maxUploadWaitMs, jobId);
      return uploadOk;
    } catch (e) {
      console.warn('[MythicFrame BEI] Error attaching reference images to Gemini:', e);
      return false;
    }
  }

  async function verifyPreSendState({ expectedPrompt, expectedImagesCount = 0, jobId = null }) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let composer = getComposerElement();
      if (!composer || !document.body.contains(composer)) {
        await new Promise(r => setTimeout(r, 200));
        composer = getComposerElement();
        if (!composer) return { ok: false, reason: 'Composer input field not found or detached from DOM.' };
      }

      // Check 1: Prompt text verification
      let text = (composer.innerText || composer.textContent || composer.value || '').trim();
      if (!text || text.length < 5) {
        console.warn(`[MythicFrame BEI Verification] Text missing in live composer (attempt ${attempt + 1}). Re-injecting...`);
        setComposerText(composer, expectedPrompt);
        await new Promise(r => setTimeout(r, 250));
        text = (composer.innerText || composer.textContent || composer.value || '').trim();
        if (!text || text.length < 5) {
          if (attempt === 2) return { ok: false, reason: 'Prompt text was empty or failed to inject into composer.' };
          continue;
        }
      }

      // Check 2: "Create image" tool tag verification
      let hasTag = isCreateImageTagActive();
      if (!hasTag) {
        console.warn(`[MythicFrame BEI Verification] "Create image" tool tag missing (attempt ${attempt + 1}). Re-activating...`);
        await ensureCreateImageMode(jobId);
        await new Promise(r => setTimeout(r, 300));
        hasTag = isCreateImageTagActive();
        if (!hasTag && expectedImagesCount > 0 && attempt === 2) {
          return {
            ok: false,
            reason: '"Create image" tool tag could not be activated in Gemini Web. Without this tag, Gemini will describe references as text rather than generating an image.'
          };
        }
      }

      // Check 3: Reference image attachment cards verification
      if (expectedImagesCount > 0) {
        const chips = Array.from(document.querySelectorAll(
          "[data-test-id*='attachment'], [data-test-id*='file'], .attachment-card, [class*='attachment'], [class*='uploader-preview'], [class*='file-preview']"
        )).filter(c => !c.closest('header, nav, [role="navigation"]'));

        const imageChips = chips.filter(c => {
          const t = (c.textContent || '').toLowerCase();
          return !t.includes('create image') && !t.includes('canvas') && !t.includes('deep research');
        });

        const hasSpinner = imageChips.some(c => c.querySelector('mat-progress-spinner, mat-spinner, [class*="spin"], [class*="loading"], [role="progressbar"]'));
        const hasError = imageChips.some(c => {
          const t = (c.textContent || '').toLowerCase();
          return t.includes('upload failed') || t.includes('error') || c.querySelector('mat-icon[fonticon="error"], mat-icon[fonticon="warning"]');
        });

        if (hasSpinner) {
          console.log('[MythicFrame BEI Verification] Image upload still in progress. Waiting...');
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
        if (hasError) {
          return { ok: false, reason: 'Gemini reference upload failed or was rejected by Google server.' };
        }
      }

      // Check 4: Send button verification
      const sendBtn = getSendButton();
      if (!sendBtn) {
        await new Promise(r => setTimeout(r, 200));
        const retryBtn = getSendButton();
        if (!retryBtn && attempt === 2) {
          return { ok: false, reason: 'Send button is disabled or not ready.' };
        }
      }

      // All verified!
      console.log('✅ [MythicFrame BEI Verification] Pre-send verification passed completely!');
      return { ok: true };
    }

    return { ok: false, reason: 'Pre-send verification timed out after 3 remediation cycles.' };
  }

  async function executePrompt(jobId, prompt, timeoutSeconds = 120, images = []) {
    let keepAlivePort = null;
    try {
      if (chrome.runtime && chrome.runtime.connect) {
        keepAlivePort = chrome.runtime.connect({ name: 'mythicframe-bei-keepalive' });
      }
    } catch (e) {}

    reportProgress(jobId, 'connecting', 'Connecting to Gemini Web composer...');

    // Wait up to 30 seconds for the composer element to become available in SPA DOM
    let composer = getComposerElement();
    if (!composer) {
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 500));
        autoDismissConsentDialogs();
        composer = getComposerElement();
        if (composer) break;
      }
    }

    if (!composer) {
      if (keepAlivePort) keepAlivePort.disconnect();
      try {
        chrome.runtime.sendMessage({
          type: 'GENERATION_FAILED',
          data: { jobId, error: 'Gemini Web composer input field not found after waiting. Is the tab fully loaded?' }
        });
      } catch (e) {}
      return;
    }

    // Always clear the composer of any previous dirty text or failed attachment chips before starting!
    reportProgress(jobId, 'clearing', 'Preparing pristine composer...');
    clearComposer();
    await new Promise(r => setTimeout(r, 350));
    composer = getComposerElement() || composer;

    // Ensure prompt explicitly requests image creation if not already tagged
    let promptToSend = prompt;
    if (!promptToSend.toLowerCase().startsWith('create image:') && !promptToSend.toLowerCase().startsWith('create an image')) {
      promptToSend = `Create image: ${promptToSend}`;
    }

    // Try selecting Create Image mode tool if available in UI
    reportProgress(jobId, 'create_image_mode', 'Activating native "Create image" tool mode...');
    await ensureCreateImageMode(jobId);

    // Attach reference images if any exist, waiting for upload to fully complete
    if (images && images.length > 0) {
      reportProgress(jobId, 'uploading_references', `Uploading reference image(s) (1/${images.length})...`);
      const maxUploadWait = Math.max((timeoutSeconds || 120) * 1000, 150000);
      const uploadSuccess = await attachReferenceImages(images, composer, jobId, maxUploadWait);
      if (!uploadSuccess) {
        clearComposer();
        if (keepAlivePort) keepAlivePort.disconnect();
        try {
          chrome.runtime.sendMessage({
            type: 'GENERATION_FAILED',
            data: {
              jobId,
              error: 'Reference image upload failed in Gemini Web (upload was rejected or timed out). The composer was cleared. Please check image format or retry.'
            }
          });
        } catch (e) {}
        return;
      }

      // Crucial: Wait 400ms for Angular DOM stabilization after reference card attaches
      await new Promise(r => setTimeout(r, 400));
    }

    // Always re-acquire FRESH composer element from DOM (guards against Angular detached nodes)
    composer = getComposerElement();
    if (!composer) {
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 100));
        composer = getComposerElement();
        if (composer) break;
      }
    }

    // Re-verify "Create image" tag in case file upload reset it
    if (!isCreateImageTagActive()) {
      console.log('[MythicFrame BEI] "Create image" tag missing after attachment. Re-activating...');
      await ensureCreateImageMode(jobId);
    }

    // Inject prompt text into the fresh composer
    reportProgress(jobId, 'submitting_prompt', 'Injecting prompt directive into composer...');
    setComposerText(composer, promptToSend);
    await new Promise(r => setTimeout(r, 250));

    // STRICT PRE-SEND VERIFICATION GATE ("THE BOUNCER")
    reportProgress(jobId, 'verifying', 'Verifying composer state before submission...');
    const verification = await verifyPreSendState({
      expectedPrompt: promptToSend,
      expectedImagesCount: images ? images.length : 0,
      jobId
    });

    if (!verification.ok) {
      console.error('[MythicFrame BEI] PRE-SEND VERIFICATION FAILED:', verification.reason);
      clearComposer();
      if (keepAlivePort) keepAlivePort.disconnect();
      try {
        chrome.runtime.sendMessage({
          type: 'GENERATION_FAILED',
          data: {
            jobId,
            error: `Pre-send verification aborted submission: ${verification.reason}`
          }
        });
      } catch (e) {}
      return;
    }

    // Snapshot existing images, urls, AND responses across entire DOM
    const existingImages = new Set();
    protocol.getAllImagesRecursively(document.body).forEach(img => {
      if (img.src) existingImages.add(img.src);
      if (img.currentSrc) existingImages.add(img.currentSrc);
    });

    const existingUrls = new Set();
    protocol.extractImageUrlsFromNode(document.body).forEach(u => existingUrls.add(u));

    const existingResponses = new Set(
      document.querySelectorAll('model-response, message-content, div.response-container, conversation-turn, [data-test-id*="response"]')
    );

    // Wait until send button is enabled (not disabled, not aria-disabled)
    let sendBtn = getSendButton();
    if (!sendBtn) {
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 200));
        sendBtn = getSendButton();
        if (sendBtn) break;
      }
    }

    // Click send button
    if (sendBtn) {
      sendBtn.click();
    } else {
      // Fallback: Dispatch Enter key
      composer.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
    }

    reportProgress(jobId, 'generating', 'Prompt submitted! Waiting for Gemini / Imagen 3 generation...');
    console.log(`[MythicFrame BEI] Prompt submitted for job ${jobId}. Watching for generated image...`);

    // Observe mutations and polls for generated images
    const startTime = Date.now();
    const timeoutMs = (timeoutSeconds || 120) * 1000;
    let imageDelivered = false;
    let jobCancelled = false;

    const handleCancel = (reason = 'User stopped generation in Gemini Web') => {
      if (imageDelivered || jobCancelled) return;
      jobCancelled = true;
      activeRunningJobId = null;
      activeCancelHandler = null;
      clearInterval(checkInterval);
      if (keepAlivePort) keepAlivePort.disconnect();
      clearComposer();

      console.log(`[MythicFrame BEI] Generation cancelled for job ${jobId}: ${reason}`);
      try {
        chrome.runtime.sendMessage({
          type: 'GENERATION_CANCELLED',
          data: {
            jobId,
            reason
          }
        });
      } catch (e) {}
    };

    activeRunningJobId = jobId;
    activeCancelHandler = handleCancel;

    const deliverImage = async (imgOrUrl, width, height) => {
      if (imageDelivered || jobCancelled) return;
      imageDelivered = true;
      activeRunningJobId = null;
      activeCancelHandler = null;
      clearInterval(checkInterval);
      if (keepAlivePort) keepAlivePort.disconnect();

      reportProgress(jobId, 'capturing_image', 'Generated artwork detected! Extracting high-resolution asset...');

      let finalData = '';
      let srcUrl = '';

      if (typeof imgOrUrl === 'string') {
        srcUrl = protocol.upgradeToHighResUrl(imgOrUrl);
        finalData = srcUrl;
      } else {
        const rawSrc = imgOrUrl.currentSrc || imgOrUrl.src || '';
        srcUrl = protocol.upgradeToHighResUrl(rawSrc);
        try {
          if (rawSrc.startsWith('blob:') || rawSrc.startsWith('data:')) {
            finalData = rawSrc.startsWith('blob:') ? await protocol.fetchBlobAsBase64(rawSrc) : rawSrc;
          } else if (srcUrl.startsWith('http')) {
            // High-Res URL passed directly to background worker to fetch full 2048px uncompressed asset
            finalData = srcUrl;
          } else {
            finalData = await protocol.imageToBase64(imgOrUrl);
          }
        } catch (e) {
          finalData = srcUrl;
        }
      }

      // Candidate grid detection (multiple images in Imagen 3 responses)
      const grid = protocol.detectCandidateGrid ? protocol.detectCandidateGrid(document.body) : null;
      const candidates = grid && grid.urls && grid.urls.length > 0 ? grid.urls : undefined;

      console.log(`[MythicFrame BEI] Successfully captured Gemini high-res image for job ${jobId}`);
      try {
        chrome.runtime.sendMessage({
          type: 'GENERATION_COMPLETED',
          data: {
            jobId,
            image: finalData,
            target: 'gemini',
            metadata: {
              srcUrl,
              width: width || 1024,
              height: height || 1024,
              candidates
            }
          }
        });
      } catch (err) {
        console.warn('[MythicFrame BEI] Message delivery notice:', err);
      }
    };

    const checkInterval = setInterval(async () => {
      if (imageDelivered || jobCancelled) {
        clearInterval(checkInterval);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        clearInterval(checkInterval);
        activeRunningJobId = null;
        activeCancelHandler = null;
        if (keepAlivePort) keepAlivePort.disconnect();
        clearComposer();
        try {
          chrome.runtime.sendMessage({
            type: 'GENERATION_FAILED',
            data: { jobId, error: `Generation timed out after ${timeoutSeconds}s waiting for Gemini Web response.` }
          });
        } catch (e) {}
        return;
      }

      // Tier 1: Check the latest response container first (most accurate for current turn)
      const allResponses = Array.from(document.querySelectorAll('model-response, message-content, div.response-container, conversation-turn, [data-test-id*="response"]'));
      const latestResponse = allResponses[allResponses.length - 1];

      if (latestResponse) {
        // 1A: Check images inside the latest response (including shadow DOM)
        const respImages = protocol.getAllImagesRecursively(latestResponse);
        for (const img of respImages) {
          const src = img.currentSrc || img.src;
          if (!src) continue;
          if (protocol.isGeneratedImage(img)) {
            if (img.complete && (img.naturalWidth > 80 || img.naturalHeight > 80 || !existingImages.has(src))) {
              await deliverImage(img, img.naturalWidth, img.naturalHeight);
              return;
            }
          }
        }

        // 1B: Check for image collection / retrieval URLs in links or text within latest response
        const respUrls = protocol.extractImageUrlsFromNode(latestResponse);
        for (const u of respUrls) {
          if (!existingUrls.has(u)) {
            await deliverImage(u);
            return;
          }
        }
      }

      // Tier 2: Check all new images on document (including shadow roots)
      const allCurrentImages = protocol.getAllImagesRecursively(document.body);
      for (const img of allCurrentImages) {
        const src = img.currentSrc || img.src;
        if (!src || existingImages.has(src)) continue;

        if (protocol.isGeneratedImage(img)) {
          if (img.complete && (img.naturalWidth > 80 || img.naturalHeight > 80)) {
            await deliverImage(img, img.naturalWidth, img.naturalHeight);
            return;
          }
        }
      }

      // Tier 3: Check all new URLs / links on the document
      const allCurrentUrls = protocol.extractImageUrlsFromNode(document.body);
      for (const u of allCurrentUrls) {
        if (!existingUrls.has(u)) {
          await deliverImage(u);
          return;
        }
      }

      // Tier 4: Cancellation, Refusal & Quota / Rate Limit Detection
      // Check latest active response if no images were found
      const newResponses = allResponses.filter(r => !existingResponses.has(r));
      const targetResponse = newResponses.length > 0 
        ? newResponses[newResponses.length - 1] 
        : (allResponses.length > existingResponses.size ? allResponses[allResponses.length - 1] : allResponses[allResponses.length - 1]);

      if (targetResponse) {
        const respText = (targetResponse.innerText || targetResponse.textContent || '').trim();
        if (respText.length > 5) {
          // A. User cancellation / stoppage phrase detection
          for (const pat of GEMINI_CANCELLATION_PATTERNS) {
            if (pat.test(respText)) {
              handleCancel(`Gemini Web response stopped: "${respText.substring(0, 100)}"`);
              return;
            }
          }

          // B. Quota / Rate Limit Detection
          for (const pat of GEMINI_RATE_LIMIT_PATTERNS) {
            if (pat.test(respText)) {
              activeRunningJobId = null;
              activeCancelHandler = null;
              clearInterval(checkInterval);
              if (keepAlivePort) keepAlivePort.disconnect();
              clearComposer();
              const quotaMsg = `Gemini quota or rate limit exceeded: "${respText.substring(0, 160)}". Please switch account slot in the MythicFrame BEI dropdown.`;
              console.warn(`[MythicFrame BEI] ${quotaMsg}`);
              try {
                chrome.runtime.sendMessage({
                  type: 'GENERATION_FAILED',
                  data: { jobId, error: quotaMsg }
                });
              } catch (e) {}
              return;
            }
          }

          // C. Refusal / Safety Policy Detection
          for (const pat of GEMINI_REFUSAL_PATTERNS) {
            if (pat.test(respText)) {
              activeRunningJobId = null;
              activeCancelHandler = null;
              clearInterval(checkInterval);
              if (keepAlivePort) keepAlivePort.disconnect();
              clearComposer();
              const excerpt = respText.length > 200 ? respText.substring(0, 200) + '...' : respText;
              const refusalMsg = `Gemini declined generation: ${excerpt}`;
              console.warn(`[MythicFrame BEI] ${refusalMsg}`);
              try {
                chrome.runtime.sendMessage({
                  type: 'GENERATION_FAILED',
                  data: { jobId, error: refusalMsg }
                });
              } catch (e) {}
              return;
            }
          }
        }
      }

      // Also check any alert dialogs or snackbars for rate limits
      const toasts = document.querySelectorAll('mat-snack-bar-container, [role="alert"], .notification-toast');
      for (const toast of toasts) {
        const toastText = (toast.innerText || toast.textContent || '').trim();
        if (toastText) {
          for (const pat of GEMINI_RATE_LIMIT_PATTERNS) {
            if (pat.test(toastText)) {
              activeRunningJobId = null;
              activeCancelHandler = null;
              clearInterval(checkInterval);
              if (keepAlivePort) keepAlivePort.disconnect();
              clearComposer();
              const quotaMsg = `Gemini quota or rate limit exceeded: "${toastText}". Please switch account slot in the MythicFrame BEI dropdown.`;
              console.warn(`[MythicFrame BEI] ${quotaMsg}`);
              try {
                chrome.runtime.sendMessage({
                  type: 'GENERATION_FAILED',
                  data: { jobId, error: quotaMsg }
                });
              } catch (e) {}
              return;
            }
          }
        }
      }
    }, 1000);
  }

  function isSystemEmail(email) {
    const lower = (email || '').toLowerCase();
    return lower.includes('noreply') || 
           lower.includes('support@google.com') || 
           lower.includes('google-support') ||
           lower.includes('example.com');
  }

  function extractGoogleAccountEmail() {
    try {
      // 1. Any element with aria-label containing @
      const ariaEls = document.querySelectorAll("[aria-label*='@']");
      for (const el of ariaEls) {
        const text = el.getAttribute('aria-label') || '';
        const m = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (m && !isSystemEmail(m[1])) return m[1];
      }

      // 2. Any element with title containing @
      const titleEls = document.querySelectorAll("[title*='@']");
      for (const el of titleEls) {
        const text = el.getAttribute('title') || '';
        const m = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (m && !isSystemEmail(m[1])) return m[1];
      }

      // 3. Any element with data-identifier or data-email
      const dataEls = document.querySelectorAll("[data-identifier*='@'], [data-email*='@']");
      for (const el of dataEls) {
        const text = (el.getAttribute('data-identifier') || '') + ' ' + (el.getAttribute('data-email') || '');
        const m = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (m && !isSystemEmail(m[1])) return m[1];
      }

      // 4. Any account button or avatar link (gb_d, SignOutOptions, accounts.google.com)
      const btns = document.querySelectorAll("a[href*='SignOutOptions'], a[href*='accounts.google.com'], a.gb_d, div.gb_d, button.gb_d, [role='button'][aria-expanded]");
      for (const el of btns) {
        let node = el;
        for (let d = 0; d < 4 && node; d++) {
          const str = (node.getAttribute('aria-label') || '') + ' ' +
                      (node.getAttribute('title') || '') + ' ' +
                      (node.getAttribute('alt') || '') + ' ' +
                      (node.innerText || '') + ' ' +
                      (node.textContent || '');
          const m = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (m && !isSystemEmail(m[1])) return m[1];
          node = node.parentElement;
        }
      }

      // 5. Check window.WIZ_global_data
      if (window.WIZ_global_data && typeof window.WIZ_global_data === 'object') {
        for (const key of Object.keys(window.WIZ_global_data)) {
          const val = String(window.WIZ_global_data[key]);
          const match = val.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (match && !isSystemEmail(match[1])) return match[1];
        }
      }

      // 6. Scan script tags
      const scripts = document.querySelectorAll("script:not([src])");
      for (const s of scripts) {
        const text = s.textContent || '';
        if (text.includes('@gmail.com')) {
          const m = text.match(/([a-zA-Z0-9._%+-]+@gmail\.com)/);
          if (m && !isSystemEmail(m[1])) return m[1];
        }
      }

      // 7. Full document HTML regex
      const html = document.documentElement ? document.documentElement.innerHTML : '';
      const htmlMatch = html.match(/([a-zA-Z0-9._%+-]+@gmail\.com)/);
      if (htmlMatch && !isSystemEmail(htmlMatch[1])) return htmlMatch[1];
    } catch (e) {}
    return "";
  }

  // Expose global execution methods so background worker can invoke directly via executeScript
  window.__MYTHIC_BEI_EXECUTE_PROMPT__ = executePrompt;
  window.__MYTHIC_BEI_GET_EMAIL__ = extractGoogleAccountEmail;

  // CustomEvent listener for direct dispatch from executeScript
  window.addEventListener('__MYTHIC_BEI_EXECUTE_PROMPT__', (e) => {
    if (e.detail) {
      const { jobId, prompt, timeoutSeconds, images } = e.detail;
      executePrompt(jobId, prompt, timeoutSeconds, images);
    }
  });

  // Re-attach message listener safely to handle extension context reloads
  if (window.__MYTHIC_BEI_GEMINI_MSG_LISTENER__ && chrome.runtime && chrome.runtime.onMessage) {
    try {
      chrome.runtime.onMessage.removeListener(window.__MYTHIC_BEI_GEMINI_MSG_LISTENER__);
    } catch (e) {}
  }

  const messageListener = (request, sender, sendResponse) => {
    if (request.action === 'GET_TAB_INFO') {
      const email = extractGoogleAccountEmail();
      const slot = protocol.extractGeminiAccountSlot(window.location.href);
      sendResponse({
        success: true,
        target: 'gemini',
        email: email,
        accountSlot: slot,
        url: window.location.href,
        title: document.title,
        composerReady: Boolean(getComposerElement())
      });
      return true;
    }

    if (request.action === 'EXECUTE_PROMPT') {
      const { jobId, prompt, timeoutSeconds, images } = request.data || {};
      executePrompt(jobId, prompt, timeoutSeconds, images);
      sendResponse({ success: true, started: true });
      return true;
    }

    if (request.action === 'CANCEL_GENERATION' || request.action === 'CLEAR_COMPOSER') {
      if (typeof activeCancelHandler === 'function') {
        activeCancelHandler('Cancelled from MythicFrame Studio');
      } else {
        clearComposer();
      }
      sendResponse({ success: true, cleared: true });
      return true;
    }
  };

  window.__MYTHIC_BEI_CLEAR_COMPOSER__ = clearComposer;

  try {
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
      window.__MYTHIC_BEI_GEMINI_MSG_LISTENER__ = messageListener;
    }
  } catch (err) {
    console.warn('[MythicFrame BEI] Could not bind onMessage listener:', err);
  }
})();
