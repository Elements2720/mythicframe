import React, { useState } from 'react';
import { AppError } from '../../types';
import { getActiveAIProvider, setActiveAIProvider } from '../../services/aiProviderService';

interface ErrorModalProps {
  error: AppError | null;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose, onOpenSettings }) => {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const currentProvider = getActiveAIProvider();
  const rawMessage = error.message || '';
  const lowerMsg = rawMessage.toLowerCase();

  const isPollinationsError = currentProvider === 'pollinations' || lowerMsg.includes('pollinations');
  const isBEIError = currentProvider === 'bei' || lowerMsg.includes('bei') || lowerMsg.includes('receiving end does not exist');
  const isGoogleError = currentProvider === 'google' || lowerMsg.includes('gemini');
  const isOpenAIError = currentProvider === 'openai' || lowerMsg.includes('openai');

  const isQuotaError = isGoogleError && (
    rawMessage.includes('429') || 
    lowerMsg.includes('quota exceeded') ||
    lowerMsg.includes('rate-limit') ||
    lowerMsg.includes('resource_exhausted')
  );

  const isAuthError = !isPollinationsError && !isBEIError && (
    rawMessage.includes('401') || 
    rawMessage.includes('403') || 
    lowerMsg.includes('api_key') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('invalid api key')
  );

  // Attempt pretty-formatting if the error text contains embedded JSON
  let formattedDetails = rawMessage;
  try {
    const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      formattedDetails = JSON.stringify(parsed, null, 2);
    }
  } catch (e) {
    // Keep raw string if parsing fails
  }

  const handleCopy = async () => {
    try {
      const textToCopy = `Error: ${error.title}\nActive Provider: ${currentProvider}\n\n${rawMessage}\n\nTimestamp: ${new Date().toISOString()}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy error to clipboard", e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-red-950/40 border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <i className="fa-solid fa-triangle-exclamation text-base" />
            </div>
            <div>
              <h3 className="font-bold text-red-200 text-base">{error.title || "Operation Failed"}</h3>
              <p className="text-xs text-red-300/70">An error occurred while processing your request</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Helpful diagnostics based on error pattern */}
          {isPollinationsError && (
            <div className="bg-pink-950/40 border border-pink-500/30 rounded-lg p-3.5 text-xs text-pink-200 space-y-2">
              <div className="font-bold flex items-center gap-2 text-pink-300">
                <i className="fa-solid fa-wand-magic-sparkles" /> Pollinations.ai Cloud Service Notice
              </div>
              <p className="text-slate-300 leading-relaxed">
                Pollinations public servers are currently busy or rate-limiting anonymous traffic (HTTP 402/403). 
                You can switch to <b>BEI Mode</b> (generate with zero API cost directly in Chrome) or configure another engine in settings.
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAIProvider('bei');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-puzzle-piece" /> Switch to BEI Mode (Free)
                </button>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-gear" /> Configure Engines
                  </button>
                )}
              </div>
            </div>
          )}

          {isBEIError && (
            <div className="bg-purple-950/40 border border-purple-500/30 rounded-lg p-3.5 text-xs text-purple-200 space-y-2">
              <div className="font-bold flex items-center gap-2 text-purple-300">
                <i className="fa-solid fa-puzzle-piece" /> BEI Browser Extension Connection
              </div>
              <p className="text-slate-300 leading-relaxed">
                MythicFrame could not communicate with your Chrome tab. Please make sure the <b>MythicFrame BEI Bridge</b> extension is reloaded in <code>chrome://extensions</code> and that a Gemini or ChatGPT tab is open.
              </p>
              {onOpenSettings && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-gear" /> Open BEI Settings
                  </button>
                </div>
              )}
            </div>
          )}

          {isQuotaError && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3.5 text-xs text-amber-200 space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-300">
                <i className="fa-solid fa-coins" /> Google Gemini API Quota Limit (429)
              </div>
              <p className="text-slate-300 leading-relaxed">
                Google provides <b>0 quota limit</b> for image generation models on the Free Tier. 
                Even if you subscribe to consumer <i>Gemini Ultra / Advanced</i>, developer API usage requires enabling 
                <b> Pay-As-You-Go billing</b> in Google Cloud / Google AI Studio.
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setActiveAIProvider('bei');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-puzzle-piece" /> Switch to BEI Mode (Free Unlimited)
                </button>
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium transition-colors"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" /> Open Google AI Studio Billing
                </a>
              </div>
            </div>
          )}

          {isAuthError && (
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3.5 text-xs text-blue-200 space-y-2">
              <div className="font-bold flex items-center gap-2 text-blue-300">
                <i className="fa-solid fa-key" /> {isOpenAIError ? 'OpenAI' : 'Gemini'} API Key Authentication Error
              </div>
              <p className="text-slate-300 leading-relaxed">
                Your API key appears invalid or unauthorized. Please verify your API key in settings.
              </p>
              {onOpenSettings && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-medium transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-gear" /> Configure API Key in Settings
                </button>
              )}
            </div>
          )}

          {/* Raw Error Details */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Error Details ({currentProvider.toUpperCase()})
              </label>
              <span className="text-[10px] text-slate-500">Scrollable monospace</span>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs text-red-300 font-mono whitespace-pre-wrap break-all max-h-56 overflow-y-auto selection:bg-red-900 selection:text-white">
              {formattedDetails}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all ${
              copied 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
            {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
