/**
 * MythicFrame BEI Bridge - Protocol Definitions & Heuristics
 * Scoped under __MYTHIC_BEI__ to ensure zero namespace collision.
 */

(() => {
  const MythicBEIProtocol = {
    BRIDGE_PORT: 58925,
    STUDIO_PORT: 3488,

    COMMANDS: {
      EXECUTE_PROMPT: 'EXECUTE_PROMPT',
      CANCEL_GENERATION: 'CANCEL_GENERATION',
      VERIFY_SESSION: 'VERIFY_SESSION',
      LIST_TABS: 'LIST_TABS',
    },

    AVATAR_PATTERNS: [
      '/ogw/',
      '/a/ACg',
      '/a/default-user',
      'favicon',
      'google_logo',
      'auth0',
      'openai.com/avatars',
      'oaistatic.com/avatars',
    ],

    AVATAR_SIZE_REGEX: /=s\d+(?:-c|-p|-ns|-rw)?/i,

    extractGeminiAccountSlot(url) {
      if (!url) return 0;
      try {
        const parsed = new URL(url);
        const match = parsed.pathname.match(/\/u\/(\d+)/);
        if (match) return parseInt(match[1], 10);
      } catch (e) {
        const match = String(url).match(/\/u\/(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
      return 0;
    },

    isGeneratedImage(imgElement) {
      if (!imgElement) return false;
      const src = imgElement.currentSrc || imgElement.src || '';
      if (!src) return false;

      // Always accept image retrieval endpoints
      if (src.includes('image_retrieval') || src.includes('image_collection')) {
        return true;
      }

      // Filter out obvious avatars and logos
      for (const pat of this.AVATAR_PATTERNS) {
        if (src.includes(pat)) return false;
      }

      const alt = (imgElement.alt || '').toLowerCase();
      const aria = (imgElement.getAttribute('aria-label') || '').toLowerCase();
      if (alt.includes('profile') || alt.includes('avatar') || aria.includes('profile') || aria.includes('avatar')) {
        return false;
      }

      // Check if rendered dimensions indicate an icon
      if (imgElement.naturalWidth > 0 && imgElement.naturalHeight > 0) {
        if (imgElement.naturalWidth < 80 || imgElement.naturalHeight < 80) {
          return false;
        }
      }

      // Valid generative image sources
      const isGoogleCdn = src.includes('googleusercontent.com') || src.includes('gstatic.com') || src.includes('photos.google.com');
      const isOpenAiBlob = src.includes('oaidalleapiprodscus') || src.includes('files.oaiusercontent.com') || src.includes('backend-api/files');
      const isBlob = src.startsWith('blob:');
      const isBase64 = src.startsWith('data:image/');

      if (isGoogleCdn || isOpenAiBlob || isBlob || isBase64) {
        return true;
      }

      // Fallback: check if parent container is a model response
      if (imgElement.closest && imgElement.closest('model-response, message-content, div.response-container, conversation-turn, [data-test-id*="response"]')) {
        return true;
      }

      return false;
    },

    getAllImagesRecursively(root = (typeof document !== 'undefined' ? document.body : null)) {
      const results = [];
      const traverse = (node) => {
        if (!node) return;
        if (node.tagName && node.tagName.toLowerCase() === 'img') {
          results.push(node);
        }
        if (node.shadowRoot) {
          traverse(node.shadowRoot);
        }
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            traverse(node.children[i]);
          }
        }
      };
      try {
        traverse(root);
      } catch (e) {}
      return results;
    },

    upgradeToHighResUrl(url) {
      if (!url || typeof url !== 'string') return url;
      try {
        // Upgrade Google CDN thumbnail sizing (=s\d+, =w\d+-h\d+, etc.) to =s2048
        if (
          url.includes('googleusercontent.com') ||
          url.includes('gstatic.com') ||
          url.includes('photos.google.com')
        ) {
          if (/=[swh]\d+/i.test(url) || /=w\d+-h\d+/i.test(url)) {
            return url.replace(/=(?:s\d+|w\d+-h\d+|w\d+|h\d+)(?:-[a-zA-Z0-9_-]+)*(?=[?&#]|$)/i, '=s2048');
          }
        }
      } catch (e) {
        console.debug('[MythicBEI] Error upgrading URL to high-res:', e);
      }
      return url;
    },

    detectCandidateGrid(root = (typeof document !== 'undefined' ? document.body : null)) {
      if (!root) return null;
      try {
        // Look for Imagen candidate grids in Gemini response
        const gridSelectors = [
          '[class*="image-grid" i]',
          '[class*="image_grid" i]',
          '[class*="candidate-grid" i]',
          '[class*="candidate_grid" i]',
          '[class*="image-container" i]',
          '[class*="generated-images" i]',
          '[data-test-id*="image-grid" i]',
          'div.images-container',
          'div.candidates-container'
        ];

        for (const sel of gridSelectors) {
          try {
            const containers = root.querySelectorAll(sel);
            for (const container of containers) {
              const imgs = Array.from(container.querySelectorAll('img'))
                .filter(img => this.isGeneratedImage(img));
              if (imgs.length >= 2) {
                return {
                  container,
                  count: imgs.length,
                  images: imgs,
                  urls: imgs.map(img => this.upgradeToHighResUrl(img.currentSrc || img.src))
                };
              }
            }
          } catch (e) {}
        }

        // Heuristic: check all generated images in root sharing an immediate common container
        const allGenImages = this.getAllImagesRecursively(root).filter(img => this.isGeneratedImage(img));
        if (allGenImages.length >= 2) {
          const parentMap = new Map();
          for (const img of allGenImages) {
            const p = img.closest('div, section, article') || img.parentElement;
            if (p) {
              if (!parentMap.has(p)) parentMap.set(p, []);
              parentMap.get(p).push(img);
            }
          }
          for (const [p, imgs] of parentMap.entries()) {
            if (imgs.length >= 2) {
              return {
                container: p,
                count: imgs.length,
                images: imgs,
                urls: imgs.map(img => this.upgradeToHighResUrl(img.currentSrc || img.src))
              };
            }
          }

          return {
            container: root,
            count: allGenImages.length,
            images: allGenImages,
            urls: allGenImages.map(img => this.upgradeToHighResUrl(img.currentSrc || img.src))
          };
        }
      } catch (e) {
        console.debug('[MythicBEI] Candidate grid detection notice:', e);
      }
      return null;
    },

    extractImageUrlsFromNode(node) {
      if (!node) return [];
      const urls = [];
      try {
        const text = node.innerText || node.textContent || '';
        const regex = /https?:\/\/[^\s"'<>]*(?:googleusercontent\.com|image_retrieval|oaiusercontent)[^\s"'<>]*/gi;
        let match;
        while ((match = regex.exec(text)) !== null) {
          urls.push(this.upgradeToHighResUrl(match[0]));
        }
        if (node.querySelectorAll) {
          const anchors = node.querySelectorAll("a[href*='image_retrieval'], a[href*='googleusercontent.com'], a[href*='oaiusercontent']");
          for (const a of anchors) {
            if (a.href) urls.push(this.upgradeToHighResUrl(a.href));
          }
          const imgs = node.querySelectorAll("img");
          for (const img of imgs) {
            const src = img.currentSrc || img.src;
            if (src && this.isGeneratedImage(img)) {
              urls.push(this.upgradeToHighResUrl(src));
            }
          }
        }
      } catch (e) {}
      return Array.from(new Set(urls));
    },

    imageToBase64(imgElement) {
      return new Promise((resolve, reject) => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imgElement.naturalWidth || imgElement.width || 1024;
          canvas.height = imgElement.naturalHeight || imgElement.height || 1024;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const rawSrc = imgElement.currentSrc || imgElement.src || '';
            resolve(this.upgradeToHighResUrl(rawSrc));
            return;
          }
          ctx.drawImage(imgElement, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (err) {
          // If tainted canvas due to CORS, return upgraded src URL
          const rawSrc = imgElement.currentSrc || imgElement.src || '';
          resolve(this.upgradeToHighResUrl(rawSrc));
        }
      });
    },

    fetchBlobAsBase64(url) {
      return new Promise((resolve, reject) => {
        const targetUrl = this.upgradeToHighResUrl(url);
        fetch(targetUrl)
          .then(res => res.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
          .catch(reject);
      });
    }
  };

  globalThis.__MYTHIC_BEI__ = MythicBEIProtocol;
})();
