import React, { useState } from 'react';
import { AppError } from '../../types';
import { getActiveAIProvider, setActiveAIProvider } from '../../services/aiProviderService';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { getLastBEIJobContext, refetchBEIAsset } from '../../services/beiService';

interface ErrorModalProps {
  error: AppError | null;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose, onOpenSettings }) => {
  const [copied, setCopied] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [refetchStatus, setRefetchStatus] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(Boolean(error), onClose);

  if (!error) return null;

  const currentProvider = getActiveAIProvider();
  const rawMessage = error.message || '';
  const lowerMsg = rawMessage.toLowerCase();

  const isPollinationsError = currentProvider === 'pollinations' || lowerMsg.includes('pollinations');
  const isBEIError = currentProvider === 'bei' || lowerMsg.includes('bei') || lowerMsg.includes('receiving end does not exist');
  const isGoogleError = currentProvider === 'google' || lowerMsg.includes('gemini');
  const isOpenAIError = currentProvider === 'openai' || lowerMsg.includes('openai');

  const lastJob = isBEIError ? getLastBEIJobContext() : null;

  const handleRefetch = async () => {
    setIsRefetching(true);
    setRefetchStatus("Querying browser session cache...");
    try {
      const result = await refetchBEIAsset(lastJob?.jobId);
      if (result && result.image) {
        setRefetchStatus("Success! Injecting rescued image into canvas...");
        window.dispatchEvent(new CustomEvent('mythic_image_generated', {
          detail: {
            image: result.image,
            metadata: { provider: 'bei', jobId: result.jobId }
          }
        }));
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setRefetchStatus("No completed image found in browser cache. Gemini may still be generating or page was refreshed.");
      }
    } catch (err: any) {
      setRefetchStatus(`Refetch failed: ${err.message || 'Unknown network error'}`);
    } finally {
      setIsRefetching(false);
    }
  };

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
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
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
            <div className="bg-purple-950/40 border border-purple-500/30 rounded-lg p-3.5 text-xs text-purple-200 space-y-3">
              <div className="font-bold flex items-center justify-between text-purple-300">
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-puzzle-piece" /> BEI Browser Extension Connection & Recovery
                </span>
                {lastJob?.accountSlot !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-700/60 text-[10px] text-purple-200 font-mono">
                    Slot {lastJob.accountSlot}{lastJob.email ? ` (${lastJob.email})` : ''}
                  </span>
                )}
              </div>

              <p className="text-slate-300 leading-relaxed">
                Communication with the browser tab encountered an issue. If Gemini already finished generating the image in Chrome, click <b>Refetch Asset from Browser</b> to rescue it without losing your session.
              </p>

              {lastJob && (
                <div className="bg-slate-950/80 border border-purple-900/50 rounded p-2.5 space-y-1.5 text-[11px] font-mono">
                  {lastJob.chatUrl && (
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                      <span className="text-slate-500 shrink-0">Chat URL:</span>
                      <a
                        href={lastJob.chatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-300 hover:text-purple-200 hover:underline truncate max-w-[320px] text-[10px]"
                        title={lastJob.chatUrl}
                      >
                        {lastJob.chatUrl} <i className="fa-solid fa-arrow-up-right-from-square text-[9px] ml-1" />
                      </a>
                    </div>
                  )}
                  {lastJob.jobId && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Job ID:</span>
                      <span className="text-slate-300 text-[10px]">{lastJob.jobId}</span>
                    </div>
                  )}
                  {lastJob.prompt && (
                    <div className="text-[10px] text-slate-400 truncate">
                      <span className="text-slate-500">Prompt:</span> {lastJob.prompt}
                    </div>
                  )}
                </div>
              )}

              {refetchStatus && (
                <div className={`p-2 rounded text-[11px] font-medium flex items-center gap-2 ${
                  refetchStatus.startsWith('Success') 
                    ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
                    : 'bg-amber-950/60 border border-amber-500/50 text-amber-200'
                }`}>
                  <i className={`fa-solid ${refetchStatus.startsWith('Success') ? 'fa-circle-check text-emerald-400' : 'fa-circle-info text-amber-400'}`} />
                  <span>{refetchStatus}</span>
                </div>
              )}

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefetch}
                  disabled={isRefetching}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <i className={`fa-solid ${isRefetching ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`} />
                  <span>{isRefetching ? 'Refetching Asset...' : 'Refetch Asset from Browser'}</span>
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
                    <i className="fa-solid fa-gear" /> Open BEI Settings
                  </button>
                )}
              </div>
            </div>
          )}

          {isQuotaError && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3.5 text-xs text-amber-200 space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-300">
                <i className="fa-solid fa-coins" /> Google Gemini API Quota Limit (429)
              </div>
              <p className="text-slate-300 leading-relaxed">
                Google provides <b>0 quota limit</b> for image generation models on the Free Tier. 
                Even if you subscribe to consumer <i>Gemini Advanced</i>, direct developer API access requires enabling 
                <b> Pay-As-You-Go billing</b> in Google Cloud / Gemini Developer Console.
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
                  <i className="fa-solid fa-puzzle-piece" /> Switch to BEI Mode (Web Session)
                </button>
                <a 
                  href="https://ai.google.dev/pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium transition-colors"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" /> Open Gemini API Pricing & Billing
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
