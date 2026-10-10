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
    /can't edit/i,
    /cannot edit/i,
    /can't create or edit/i,
    /unable to edit/i,
    /based on uploaded/i,
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

  function clickStopButton() {
    console.log('[MythicFrame BEI] Attempting to click native Stop button in Gemini Web...');
    let clicked = false;
    for (const sel of STOP_BUTTON_SELECTORS) {
      try {
        const btn = document.querySelector(sel);
        if (btn && btn.offsetParent !== null && !btn.disabled) {
          console.log('[MythicFrame BEI] Clicking Stop button via selector:', sel);
          btn.click();
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          clicked = true;
          break;
        }
      } catch (e) {}
    }

    if (!clicked) {
      const allButtons = document.querySelectorAll('button, [role="button"]');
      for (const btn of allButtons) {
        if (isStopButtonElement(btn) && btn.offsetParent !== null && !btn.disabled) {
          console.log('[MythicFrame BEI] Clicking Stop button via element match:', btn);
          btn.click();
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          clicked = true;
          break;
        }
      }
    }

    // Follow-up pulse 250ms later in case the UI is mid-transition
    setTimeout(() => {
      for (const sel of STOP_BUTTON_SELECTORS) {
        try {
          const btn = document.querySelector(sel);
          if (btn && btn.offsetParent !== null && !btn.disabled) {
            btn.click();
          }
        } catch (e) {}
      }
    }, 250);

    return clicked;
  }

  function getStopButton() {
    try {
      const candidates = Array.from(document.querySelectorAll(STOP_BUTTON_SELECTORS.join(', ')));
      for (const btn of candidates) {
        if (btn && btn.offsetParent !== null && !btn.disabled) return btn;
      }
      const composerButtons = Array.from(document.querySelectorAll('.input-area button, .bottom-container button, .chat-input-container button, form button'));
      for (const btn of composerButtons) {
        if (isStopButtonElement(btn) && btn.offsetParent !== null && !btn.disabled) return btn;
      }
    } catch (e) {}
    return null;
  }

  function isGeminiActivelyGenerating() {
    try {
      const stopBtn = getStopButton();
      if (stopBtn) return true;

      const bodyText = (document.body.innerText || '').toLowerCase();
      if (bodyText.includes('creating your image') || bodyText.includes('generating your image') || bodyText.includes('creating image')) {
        return true;
      }

      const shimmerEl = document.querySelector('.shimmer, .loading, mat-progress-bar, mat-progress-spinner, [aria-label*="creating" i], [aria-label*="loading" i]');
      if (shimmerEl && shimmerEl.offsetParent !== null) return true;

      return false;
    } catch (e) {
      return false;
    }
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
      // 1. Direct check for custom injected tag
      if (document.querySelector('#custom-create-image-tag')) return true;

      // 2. Native Google Angular chips and tool buttons
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

  function injectCustomCreateImageTag() {
    try {
      if (document.querySelector('#custom-create-image-tag')) return true;

      const inputContainer = document.querySelector('.text-input-field') || 
                             document.querySelector('.input-area') || 
                             document.querySelector('.chat-input-container') ||
                             document.querySelector('rich-textarea')?.parentElement;
      if (!inputContainer) {
        console.warn('[MythicFrame BEI] Chat input area not found for visual tag injection');
        return false;
      }

      // Create tag wrapper
      const tag = document.createElement('div');
      tag.id = 'custom-create-image-tag';
      tag.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background-color: var(--lumi-sys-color--surface-dim, #282a2d);
        color: var(--lumi-sys-color--on-surface, #e3e3e3);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 4px 10px 4px 10px;
        border-radius: 16px;
        font-family: Google Sans, Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        margin: 8px 12px 4px 12px;
        width: fit-content;
        user-select: none;
      `;

      tag.innerHTML = `
        <span style="font-family:'Luminous Symbols', 'Material Symbols Outlined'; font-size:16px;">brush</span>
        <span>Create image</span>
        <span style="cursor: pointer; margin-left: 4px; opacity: 0.7; font-size: 14px;" title="Remove" onclick="this.parentElement.remove()">✕</span>
      `;

      // Insert above the text input
      inputContainer.prepend(tag);
      console.log('✅ [MythicFrame BEI] Visual "Create image" tag injected into chat input.');
      return true;
    } catch (err) {
      console.warn('[MythicFrame BEI] Error injecting custom tag:', err);
      return false;
    }
  }

  function ensureTextMessageMode() {
    try {
      const customTag = document.querySelector('#custom-create-image-tag');
      if (customTag) customTag.remove();

      // Also remove any native tool chips if present
      const toolChips = document.querySelectorAll('[aria-label*="Remove Create image" i], mat-chip:has([aria-label*="Create image" i])');
      for (const c of toolChips) {
        const btn = c.querySelector('button') || c;
        try { btn.click(); } catch (e) {}
      }
    } catch (e) {}
  }

  async function ensureCreateImageMode(jobId = null) {
    try {
      if (isCreateImageTagActive()) {
        console.log('[MythicFrame BEI] "Create image" tool mode already active in composer.');
        return true;
      }

      // Close any stray open menus/overlays by clicking body safely
      const openMenus = document.querySelectorAll('.cdk-overlay-pane [role="menu"]');
      if (openMenus.length > 0) {
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise(r => setTimeout(r, 100));
      }

      const ok = injectCustomCreateImageTag();
      if (ok) {
        if (jobId) reportProgress(jobId, 'create_image_mode', '"Create image" visual tag active.');
        return true;
      }
    } catch (e) {
      console.debug('[MythicFrame BEI] ensureCreateImageMode notice:', e);
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
        if (aria.includes('create image') || text.includes('create image') || chipText.toLowerCase().includes('create image') || btn.closest('#custom-create-image-tag')) {
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
    let lastProgressPing = Date.now();

    console.log(`[MythicFrame BEI] Waiting up to ${Math.round(maxWaitMs / 1000)}s for ${expectedCount} reference image(s) to finish uploading...`);
    if (jobId) reportProgress(jobId, 'verifying_upload', `Verifying reference image upload in Gemini Web...`);

    while (true) {
      autoDismissConsentDialogs();
      await new Promise(r => setTimeout(r, 400));

      const now = Date.now();
      const elapsed = now - startTime;

      // Heartbeat: keep bridge alive every 3 seconds even on slower networks (4 Mbps)
      if (jobId && (now - lastProgressPing > 3000)) {
        lastProgressPing = now;
        const elapsedSec = Math.round(elapsed / 1000);
        reportProgress(jobId, 'uploading_references', `Transmitting reference image to Google media servers (${elapsedSec}s)...`);
      }

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
      if (elapsed > maxWaitMs && !isUploading && timeSinceLastProgress > 60000) {
        console.warn(`[MythicFrame BEI] Attachment upload wait reached timeout (${elapsed}ms, stalled for ${timeSinceLastProgress}ms).`);
        return false;
      }
      if (elapsed > 900000) {
        console.warn(`[MythicFrame BEI] Attachment upload reached absolute 15-minute safety ceiling.`);
        return false;
      }
    }
  }

  async function attachReferenceImages(images, composer, jobId = null, maxUploadWaitMs = 600000) {
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

  async function executePrompt(jobId, prompt, timeoutSeconds = 900, images = []) {
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
      const maxUploadWait = Math.max((timeoutSeconds || 900) * 1000, 600000);
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
      document.querySelectorAll('model-response, message-content, div.response-container, [data-test-id*="response"]')
    );

    // Track baseline model responses so we NEVER inspect previous turns or user turns
    const baselineModelResponses = Array.from(document.querySelectorAll('model-response, [data-test-id*="model-response"]'))
      .filter(r => !r.closest('user-query, .user-query, .chat-input-container'));
    const baselineResponseCount = baselineModelResponses.length;

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
    const timeoutMs = (timeoutSeconds || 900) * 1000;
    let lastHeartbeatTime = Date.now();
    let imageDelivered = false;
    let jobCancelled = false;

    const handleCancel = (reason = 'User stopped generation in Gemini Web') => {
      if (imageDelivered || jobCancelled) return;
      jobCancelled = true;
      activeRunningJobId = null;
      activeCancelHandler = null;
      clearInterval(checkInterval);
      if (keepAlivePort) keepAlivePort.disconnect();
      clickStopButton();
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
        srcUrl = imgOrUrl;
        if (imgOrUrl.startsWith('data:image')) {
          finalData = imgOrUrl;
        } else {
          try {
            finalData = await protocol.fetchBlobAsBase64(srcUrl);
          } catch (e) {
            finalData = srcUrl;
          }
        }
      } else {
        const rawSrc = imgOrUrl.currentSrc || imgOrUrl.src || '';
        srcUrl = rawSrc;
        try {
          if (rawSrc.startsWith('blob:')) {
            finalData = await protocol.fetchBlobAsBase64(rawSrc);
          } else if (rawSrc.startsWith('data:image')) {
            finalData = rawSrc;
          } else {
            finalData = await protocol.imageToBase64(imgOrUrl);
          }
        } catch (e) {
          finalData = srcUrl;
        }
      }

      // Final sanity check: if finalData is still not base64 and srcUrl exists, attempt one last fetch
      if ((!finalData || !finalData.startsWith('data:image')) && srcUrl) {
        try {
          finalData = await protocol.fetchBlobAsBase64(srcUrl);
        } catch (e) {}
      }

      // Candidate grid detection (multiple images in Imagen 3 responses)
      const grid = protocol.detectCandidateGrid ? protocol.detectCandidateGrid(document.body) : null;
      const candidates = grid && grid.urls && grid.urls.length > 0 ? grid.urls : undefined;

      const isBase64 = typeof finalData === 'string' && finalData.startsWith('data:image');
      const retrievalMethod = isBase64 ? 'in_page_converted' : 'raw_url_passed';

      reportProgress(jobId, 'payload_ready', isBase64 
        ? `Asset captured as Base64 Data URI (${Math.round(finalData.length / 1024)} KB). Dispatching...`
        : `Asset captured as direct URL. Dispatching for worker conversion...`
      );

      console.log(`[MythicFrame BEI] Captured Gemini image for job ${jobId} (format: ${isBase64 ? 'base64' : 'url'}, size: ${finalData.length})`);
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
              candidates,
              retrievalMethod,
              imageFormat: isBase64 ? 'base64' : 'url',
              imageSize: finalData.length
            }
          }
        });
      } catch (err) {
        console.warn('[MythicFrame BEI] Message delivery notice:', err);
      }
    };

    function isUserAttachedImage(img) {
      if (!img) return false;
      // STRICT FILTER: NEVER grab images inside user query, prompt bubble, attachment containers, or composer
      if (img.closest('user-query, .user-query-container, .user-query, rich-textarea, .attachment, mat-chip, [data-test-id*="user"], .user-message, .input-area, .chat-input-container, form, gem-composer')) {
        return true;
      }
      return false;
    }

    function isModelResponseGenerating(node) {
      if (!node) return false;
      const text = (node.innerText || node.textContent || '').toLowerCase();
      if (text.includes('creating your image') || 
          text.includes('generating your image') || 
          text.includes('creating image') ||
          text.includes('generating image')) {
        return true;
      }
      if (node.querySelector('.loading, .shimmer, [aria-label*="creating" i], [aria-label*="loading" i], mat-progress-bar, mat-progress-spinner, .progress-bar')) {
        return true;
      }
      return false;
    }

    const checkInterval = setInterval(async () => {
      try {
        if (imageDelivered || jobCancelled) {
          clearInterval(checkInterval);
          return;
        }

        const elapsed = Date.now() - startTime;
        const now = Date.now();

        // Heartbeat: Ping bridge every 3 seconds to keep WebSocket job timer alive
        if (now - lastHeartbeatTime >= 3000) {
          lastHeartbeatTime = now;
          const elapsedSec = Math.round(elapsed / 1000);
          reportProgress(jobId, 'generating', `Gemini is rendering image (${elapsedSec}s elapsed)...`);
        }

        if (elapsed > timeoutMs) {
          // If Gemini is still actively generating (Stop button is present OR "... Creating your image" / shimmer is visible),
          // allow up to 30s grace period, but do not hang indefinitely.
          if (isGeminiActivelyGenerating() && elapsed < timeoutMs + 30000) {
            return;
          }

          clearInterval(checkInterval);
          activeRunningJobId = null;
          activeCancelHandler = null;
          if (keepAlivePort) keepAlivePort.disconnect();
          clickStopButton();
          clearComposer();
          try {
            chrome.runtime.sendMessage({
              type: 'GENERATION_FAILED',
              data: { jobId, error: `Generation timed out after ${timeoutSeconds}s waiting for Gemini Web response.` }
            });
          } catch (e) {}
          return;
        }

        // Tier 1: Check ONLY model responses created for this turn (excluding user turns!)
        const currentModelResponses = Array.from(document.querySelectorAll('model-response, [data-test-id*="model-response"]'))
          .filter(r => !r.closest('user-query, .user-query, .chat-input-container'));

        const latestResponse = currentModelResponses.length > baselineResponseCount
          ? currentModelResponses[currentModelResponses.length - 1]
          : (currentModelResponses.length > 0 ? currentModelResponses[currentModelResponses.length - 1] : null);

        if (latestResponse) {
          // If Gemini is still in "Creating your image" state, WAIT and DO NOT deliver anything!
          if (isModelResponseGenerating(latestResponse)) {
            return;
          }

          // 1A: Check images strictly inside this latest model response
          const respImages = protocol.getAllImagesRecursively(latestResponse);
          for (const img of respImages) {
            if (isUserAttachedImage(img)) continue;
            const src = img.currentSrc || img.src;
            if (!src || existingImages.has(src)) continue;

            if (protocol.isGeneratedImage(img)) {
              if (img.complete && (img.naturalWidth > 120 || img.naturalHeight > 120)) {
                await deliverImage(img, img.naturalWidth, img.naturalHeight);
                return;
              }
            }
          }

          // 1B: Check for image collection / retrieval URLs strictly inside latest model response
          const respUrls = protocol.extractImageUrlsFromNode(latestResponse);
          for (const u of respUrls) {
            if (!existingUrls.has(u)) {
              await deliverImage(u);
              return;
            }
          }
        }

        // Tier 2: Check all new images ONLY inside any completed model-response container
        for (const modelResp of currentModelResponses) {
          if (isModelResponseGenerating(modelResp)) continue;
          const imagesInModel = protocol.getAllImagesRecursively(modelResp);
          for (const img of imagesInModel) {
            if (isUserAttachedImage(img)) continue;
            const src = img.currentSrc || img.src;
            if (!src || existingImages.has(src)) continue;

            if (protocol.isGeneratedImage(img)) {
              if (img.complete && (img.naturalWidth > 120 || img.naturalHeight > 120)) {
                await deliverImage(img, img.naturalWidth, img.naturalHeight);
                return;
              }
            }
          }
        }

        // Tier 3: Broad document fallback for generated image in modern Gemini turns
        const allDocImages = protocol.getAllImagesRecursively(document.body);
        for (const img of allDocImages) {
          if (isUserAttachedImage(img)) continue;
          const src = img.currentSrc || img.src;
          if (!src || existingImages.has(src)) continue;

          if (protocol.isGeneratedImage(img)) {
            if (img.complete && (img.naturalWidth > 120 || img.naturalHeight > 120)) {
              await deliverImage(img, img.naturalWidth, img.naturalHeight);
              return;
            }
          }
        }

        // Tier 4: Cancellation, Refusal & Quota / Rate Limit Detection
        const allCurrentResponses = Array.from(
          document.querySelectorAll('model-response, message-content, div.response-container, [data-test-id*="response"]')
        ).filter(r => !r.closest('user-query, .user-query, .chat-input-container'));
        const newResponses = allCurrentResponses.filter(r => !existingResponses.has(r));
        const targetResponse = newResponses.length > 0 
          ? newResponses[newResponses.length - 1] 
          : (allCurrentResponses.length > existingResponses.size ? allCurrentResponses[allCurrentResponses.length - 1] : null);

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
                clickStopButton();
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
                clickStopButton();
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
                clickStopButton();
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
      } catch (err) {
        console.error('[MythicFrame BEI] checkInterval non-fatal polling error:', err);
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

  async function executeTextPrompt(jobId, prompt, timeoutSeconds = 60) {
    let keepAlivePort = null;
    try {
      if (chrome.runtime && chrome.runtime.connect) {
        keepAlivePort = chrome.runtime.connect({ name: 'mythicframe-bei-keepalive' });
      }
    } catch (e) {}

    reportProgress(jobId, 'preparing', 'Preparing Gemini Web for text generation...');

    // 1. Remove "Create image" tag to ensure clean text mode!
    ensureTextMessageMode();
    clearComposer();

    const composer = await waitForComposer(15000);
    if (!composer) {
      reportFailed(jobId, 'Composer element not found in Gemini Web.');
      if (keepAlivePort) keepAlivePort.disconnect();
      return;
    }

    // Record response count before sending prompt
    const initialResponsesCount = document.querySelectorAll('model-response, .message-content, [data-test-id*="model-response"]').length;

    // Set prompt text
    setComposerText(composer, prompt);
    await new Promise(r => setTimeout(r, 300));

    // Send prompt
    const sent = await submitComposer(composer);
    if (!sent) {
      reportFailed(jobId, 'Failed to click send button in Gemini Web.');
      if (keepAlivePort) keepAlivePort.disconnect();
      return;
    }

    reportProgress(jobId, 'generating_text', 'Gemini AI generating text...');

    // Poll for text response
    const startTime = Date.now();
    const timeoutMs = (timeoutSeconds || 60) * 1000;

    let textDelivered = false;

    const interval = setInterval(async () => {
      if (textDelivered) return;

      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        clearInterval(interval);
        if (keepAlivePort) keepAlivePort.disconnect();
        reportFailed(jobId, 'Text generation timed out in browser tab.');
        return;
      }

      const allResponses = Array.from(document.querySelectorAll('model-response, .message-content, [data-test-id*="model-response"]'));
      if (allResponses.length > initialResponsesCount) {
        const latest = allResponses[allResponses.length - 1];
        const isGenerating = isModelResponseGenerating(latest);
        const text = (latest.innerText || latest.textContent || '').trim();

        if (!isGenerating && text.length > 5) {
          textDelivered = true;
          clearInterval(interval);
          if (keepAlivePort) keepAlivePort.disconnect();

          console.log(`[MythicFrame BEI] Captured text response for job ${jobId}`);
          try {
            chrome.runtime.sendMessage({
              type: 'TEXT_COMPLETED',
              data: {
                jobId,
                text,
                target: 'gemini'
              }
            });
          } catch (e) {}
        }
      }
    }, 400);
  }

  // Expose global execution methods so background worker can invoke directly via executeScript
  window.__MYTHIC_BEI_EXECUTE_PROMPT__ = executePrompt;
  window.__MYTHIC_BEI_EXECUTE_TEXT_PROMPT__ = executeTextPrompt;
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

    if (request.action === 'EXECUTE_TEXT_PROMPT') {
      const { jobId, prompt, timeoutSeconds } = request.data || {};
      executeTextPrompt(jobId, prompt, timeoutSeconds);
      sendResponse({ success: true, started: true });
      return true;
    }

    if (request.action === 'CANCEL_GENERATION' || request.action === 'CLEAR_COMPOSER') {
      clickStopButton();
      if (typeof activeCancelHandler === 'function') {
        activeCancelHandler('Cancelled from MythicFrame Studio');
      } else {
        clearComposer();
      }
      sendResponse({ success: true, cleared: true, stopped: true });
      return true;
    }
  };

  window.__MYTHIC_BEI_CLEAR_COMPOSER__ = clearComposer;
  window.__MYTHIC_BEI_CLICK_STOP_BUTTON__ = clickStopButton;
  window.__MYTHIC_BEI_CANCEL__ = () => {
    clickStopButton();
    if (typeof activeCancelHandler === 'function') {
      activeCancelHandler('Cancelled from MythicFrame Studio');
    } else {
      clearComposer();
    }
  };

  try {
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
      window.__MYTHIC_BEI_GEMINI_MSG_LISTENER__ = messageListener;
    }
  } catch (err) {
    console.warn('[MythicFrame BEI] Could not bind onMessage listener:', err);
  }

  // Proactively extract and announce logged-in email to background worker
  function announceTabEmail() {
    try {
      const email = extractGoogleAccountEmail();
      const slot = protocol.extractGeminiAccountSlot(window.location.href);
      if (email && !isSystemEmail(email) && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'TAB_INFO_PROACTIVE',
          data: {
            target: 'gemini',
            email,
            accountSlot: slot,
            url: window.location.href
          }
        }, () => {});
      }
    } catch (e) {}
  }

  // Announce immediately and retry after DOM elements hydrate
  setTimeout(announceTabEmail, 500);
  setTimeout(announceTabEmail, 2000);
  setTimeout(announceTabEmail, 5000);
})();
