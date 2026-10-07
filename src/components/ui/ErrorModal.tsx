import React, { useState } from 'react';
import { AppError } from '../../types';

interface ErrorModalProps {
  error: AppError | null;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose, onOpenSettings }) => {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const rawMessage = error.message || '';
  const isQuotaError = rawMessage.includes('429') || 
                       rawMessage.toLowerCase().includes('quota exceeded') ||
                       rawMessage.toLowerCase().includes('rate-limit');
  const isAuthError = rawMessage.includes('401') || 
                      rawMessage.includes('403') || 
                      rawMessage.toLowerCase().includes('api_key') ||
                      rawMessage.toLowerCase().includes('unauthorized') ||
                      rawMessage.toLowerCase().includes('invalid api key');

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
      const textToCopy = `Error: ${error.title}\n\n${rawMessage}\n\nTimestamp: ${new Date().toISOString()}`;
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
              <div className="pt-1 flex gap-2">
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
                <i className="fa-solid fa-key" /> API Key Authentication Error
              </div>
              <p className="text-slate-300 leading-relaxed">
                Your Gemini API key appears invalid or unauthorized. Please verify your API key in settings.
              </p>
              {onOpenSettings && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-medium transition-colors"
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
                Error Details
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
