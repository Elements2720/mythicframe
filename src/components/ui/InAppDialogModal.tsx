import React, { useEffect, useState, useRef } from 'react';
import { subscribeDialog, DialogRequest } from '../../services/dialogService';

export const InAppDialogModal: React.FC = () => {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeDialog((d) => {
      setDialog(d);
      if (d && d.type === 'prompt') {
        setInputValue(d.defaultValue || '');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (dialog.type === 'confirm' || dialog.type === 'prompt') {
          dialog.resolve(dialog.type === 'prompt' ? null : false);
        } else {
          dialog.resolve(undefined);
        }
      } else if (e.key === 'Enter') {
        // If not in input or in single-line input
        if (dialog.type === 'prompt') {
          e.preventDefault();
          dialog.resolve(inputValue);
        } else if (dialog.type === 'confirm') {
          e.preventDefault();
          dialog.resolve(true);
        } else {
          e.preventDefault();
          dialog.resolve(undefined);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, inputValue]);

  if (!dialog) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (dialog.type === 'alert') dialog.resolve(undefined);
        else if (dialog.type === 'confirm') dialog.resolve(false);
        else dialog.resolve(null);
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            dialog.isDestructive 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : dialog.type === 'prompt'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
          }`}>
            {dialog.isDestructive ? (
              <i className="fa-solid fa-triangle-exclamation text-lg" />
            ) : dialog.type === 'prompt' ? (
              <i className="fa-solid fa-pen-to-square text-lg" />
            ) : dialog.type === 'alert' ? (
              <i className="fa-solid fa-circle-info text-lg" />
            ) : (
              <i className="fa-solid fa-circle-question text-lg" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white tracking-wide">
              {dialog.title}
            </h3>
            <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
              {dialog.message}
            </p>
          </div>
        </div>

        {dialog.type === 'prompt' && (
          <div className="mt-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              placeholder="Enter value..."
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
            <button
              type="button"
              onClick={() => dialog.resolve(dialog.type === 'prompt' ? null : false)}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              {dialog.cancelText || 'Cancel'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (dialog.type === 'prompt') dialog.resolve(inputValue);
              else if (dialog.type === 'confirm') dialog.resolve(true);
              else dialog.resolve(undefined);
            }}
            className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-lg transition-all ${
              dialog.isDestructive
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30'
                : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30'
            }`}
          >
            {dialog.confirmText || (dialog.type === 'alert' ? 'OK' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
