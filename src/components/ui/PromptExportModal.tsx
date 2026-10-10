import React, { useState } from 'react';
import { PromptExportBundle } from '../../utils/promptExporter';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface PromptExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: PromptExportBundle | null;
  isNoApiKeyNotice?: boolean;
}

type TabType = 'midjourney' | 'chatgpt' | 'sd' | 'pollinations' | 'assembled' | 'json';

export const PromptExportModal: React.FC<PromptExportModalProps> = ({
  isOpen,
  onClose,
  bundle,
  isNoApiKeyNotice = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('midjourney');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  if (!isOpen || !bundle) return null;

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <i className="fa-solid fa-wand-magic-sparkles text-sm" />
              </div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Assembled Prompt & Parameters
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Export fully formatted prompts for any AI image generation tool or external service.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-times" />
          </button>
        </div>

        {/* Notice Banner if triggered via no-api mode */}
        {isNoApiKeyNotice && (
          <div className="px-5 py-3 bg-amber-950/40 border-b border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
            <i className="fa-solid fa-circle-info text-amber-400 text-sm shrink-0" />
            <div className="flex-1">
              <span className="font-bold">No API key required!</span> We packaged your complete composition, lore context, and art style directives into ready-to-copy prompts below.
            </div>
          </div>
        )}

        {/* Quick Parameter Badges */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-md text-slate-300 font-mono flex items-center gap-1.5">
            <i className="fa-solid fa-crop text-purple-400 text-[10px]" /> {bundle.aspectRatio} ({bundle.resolution})
          </span>
          <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-md text-slate-300 font-mono flex items-center gap-1.5">
            <i className="fa-solid fa-palette text-blue-400 text-[10px]" /> {bundle.styleName}
          </span>
          {bundle.framing && (
            <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-md text-slate-300 font-mono flex items-center gap-1.5">
              <i className="fa-solid fa-camera text-emerald-400 text-[10px]" /> {bundle.framing}
            </span>
          )}
          {bundle.seed !== undefined && bundle.seed !== null && (
            <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-md text-slate-300 font-mono flex items-center gap-1.5">
              <i className="fa-solid fa-dice text-yellow-400 text-[10px]" /> Seed: {bundle.seed}
            </span>
          )}
        </div>

        {/* Format Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 gap-1 overflow-x-auto shrink-0">
          {[
            { id: 'midjourney', label: 'Midjourney', icon: 'fa-sailboat' },
            { id: 'chatgpt', label: 'ChatGPT / DALL-E', icon: 'fa-robot' },
            { id: 'sd', label: 'Stable Diffusion', icon: 'fa-sliders' },
            { id: 'pollinations', label: 'Pollinations (Free)', icon: 'fa-bolt' },
            { id: 'assembled', label: 'Plain Assembled', icon: 'fa-align-left' },
            { id: 'json', label: 'JSON Metadata', icon: 'fa-code' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-[11px]`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          {activeTab === 'midjourney' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Ready to paste into Discord or the Midjourney web app:</span>
                <button
                  onClick={() => copyToClipboard(bundle.midjourney, 'mj')}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <i className={`fa-solid ${copiedKey === 'mj' ? 'fa-check text-green-300' : 'fa-copy'}`} />
                  <span>{copiedKey === 'mj' ? 'Copied!' : 'Copy Midjourney Prompt'}</span>
                </button>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-slate-200 leading-relaxed whitespace-pre-wrap select-all">
                {bundle.midjourney}
              </div>
              <p className="text-[11px] text-slate-500">
                Includes aspect ratio parameter <code>--ar {bundle.aspectRatio === 'custom' ? '16:9' : bundle.aspectRatio}</code>, version 6.1, and negative filtering.
              </p>
            </div>
          )}

          {activeTab === 'chatgpt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Ready to paste directly into ChatGPT (GPT-4o / DALL-E 3):</span>
                <button
                  onClick={() => copyToClipboard(bundle.chatgpt, 'chatgpt')}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <i className={`fa-solid ${copiedKey === 'chatgpt' ? 'fa-check text-green-300' : 'fa-copy'}`} />
                  <span>{copiedKey === 'chatgpt' ? 'Copied!' : 'Copy ChatGPT Prompt'}</span>
                </button>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-slate-200 leading-relaxed whitespace-pre-wrap select-all">
                {bundle.chatgpt}
              </div>
            </div>
          )}

          {activeTab === 'sd' && (
            <div className="space-y-4">
              {/* Positive Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase text-[11px]">
                    <i className="fa-solid fa-plus-circle" /> Positive Prompt
                  </span>
                  <button
                    onClick={() => copyToClipboard(bundle.stableDiffusion.positive, 'sd-pos')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] flex items-center gap-1"
                  >
                    <i className={`fa-solid ${copiedKey === 'sd-pos' ? 'fa-check text-green-400' : 'fa-copy'}`} />
                    <span>{copiedKey === 'sd-pos' ? 'Copied' : 'Copy Positive'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-slate-200 whitespace-pre-wrap select-all text-[11px]">
                  {bundle.stableDiffusion.positive}
                </div>
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-400 flex items-center gap-1.5 uppercase text-[11px]">
                    <i className="fa-solid fa-minus-circle" /> Negative Prompt
                  </span>
                  <button
                    onClick={() => copyToClipboard(bundle.stableDiffusion.negative, 'sd-neg')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] flex items-center gap-1"
                  >
                    <i className={`fa-solid ${copiedKey === 'sd-neg' ? 'fa-check text-green-400' : 'fa-copy'}`} />
                    <span>{copiedKey === 'sd-neg' ? 'Copied' : 'Copy Negative'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-slate-200 whitespace-pre-wrap select-all text-[11px]">
                  {bundle.stableDiffusion.negative}
                </div>
              </div>

              {/* Recommended Parameters */}
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                <div><span className="text-slate-500 block">Resolution</span> {bundle.stableDiffusion.parameters.resolution}</div>
                <div><span className="text-slate-500 block">Sampler</span> {bundle.stableDiffusion.parameters.sampler}</div>
                <div><span className="text-slate-500 block">Steps / CFG</span> {bundle.stableDiffusion.parameters.steps} / {bundle.stableDiffusion.parameters.cfgScale}</div>
                <div><span className="text-slate-500 block">Seed</span> {String(bundle.stableDiffusion.parameters.seed)}</div>
              </div>
            </div>
          )}

          {activeTab === 'pollinations' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Free instant generation URL (no API key required):</span>
                <div className="flex gap-2">
                  <a
                    href={bundle.pollinations.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                    <span>Open in Browser (Free)</span>
                  </a>
                  <button
                    onClick={() => copyToClipboard(bundle.pollinations.url, 'pollinations')}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <i className={`fa-solid ${copiedKey === 'pollinations' ? 'fa-check text-green-300' : 'fa-copy'}`} />
                    <span>{copiedKey === 'pollinations' ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-slate-300 break-all select-all text-[11px]">
                {bundle.pollinations.url}
              </div>
              <p className="text-[11px] text-slate-500">
                You can paste this link in any browser or Markdown document to immediately render without any account or API key.
              </p>
            </div>
          )}

          {activeTab === 'assembled' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Complete assembled prompt with all constraints:</span>
                <button
                  onClick={() => copyToClipboard(bundle.assembledPrompt, 'assembled')}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <i className={`fa-solid ${copiedKey === 'assembled' ? 'fa-check text-green-300' : 'fa-copy'}`} />
                  <span>{copiedKey === 'assembled' ? 'Copied!' : 'Copy Full Text'}</span>
                </button>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-slate-200 leading-relaxed whitespace-pre-wrap select-all">
                {bundle.assembledPrompt}
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Structured parameter dictionary:</span>
                <button
                  onClick={() => copyToClipboard(bundle.json, 'json')}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <i className={`fa-solid ${copiedKey === 'json' ? 'fa-check text-green-300' : 'fa-copy'}`} />
                  <span>{copiedKey === 'json' ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-purple-300 leading-relaxed whitespace-pre-wrap select-all text-[11px]">
                {bundle.json}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Tip: Switch mode to "Prompt-Only" anytime to bypass rendering and copy prompts instantly.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
