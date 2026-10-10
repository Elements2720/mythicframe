import React, { useState } from 'react';
import { requestServerShutdown } from '../../services/systemService';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface ShutdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShutdownModal: React.FC<ShutdownModalProps> = ({ isOpen, onClose }) => {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(isOpen && !isShuttingDown && !isTerminated, onClose);

  if (!isOpen) return null;

  const handleConfirmShutdown = async () => {
    setIsShuttingDown(true);
    setError(null);
    try {
      const res = await requestServerShutdown();
      if (!res.success && res.error) {
        setError(res.error);
        setIsShuttingDown(false);
        return;
      }
      // Successfully signaled server
      setTimeout(() => {
        setIsShuttingDown(false);
        setIsTerminated(true);
      }, 400);
    } catch (err: any) {
      // If network breaks because server process terminated, that's expected
      setIsShuttingDown(false);
      setIsTerminated(true);
    }
  };

  const handleCloseTab = () => {
    window.close();
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative border-t-2 border-t-red-500/80"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 bg-red-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="p-6 relative z-10">
          {!isTerminated ? (
            <>
              {/* Header */}
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
                  <i className="fa-solid fa-power-off text-2xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Turn Off MythicFrame
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Shutdown localhost web server and background daemons
                  </p>
                </div>
                {!isShuttingDown && (
                  <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-300 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
                    title="Close"
                  >
                    <i className="fa-solid fa-xmark text-base" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="space-y-4 mb-6">
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 space-y-2.5">
                  <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <span>This action will stop the following local services:</span>
                  </div>
                  <ul className="space-y-1.5 pl-5 list-disc text-slate-400">
                    <li><strong className="text-slate-200">Main Web Server</strong> (Port 3488 / Vite / Express)</li>
                    <li><strong className="text-slate-200">BEI Bridge Daemon</strong> (Port 58925 WebSocket & API)</li>
                    <li><strong className="text-slate-200">Active Database connections</strong> (assets.db)</li>
                  </ul>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
                  <i className="fa-solid fa-circle-info text-sm shrink-0" />
                  <span>Any unsaved temporary changes on active canvas tools will be discarded.</span>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-sm shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isShuttingDown}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmShutdown}
                  disabled={isShuttingDown}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isShuttingDown ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-sm" />
                      <span>Shutting Down Server...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-power-off text-sm" />
                      <span>Turn Off Server & Quit</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Server Stopped Screen */
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 mx-auto flex items-center justify-center text-red-400 shadow-xl shadow-red-950/40 relative">
                <i className="fa-solid fa-power-off text-2xl" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  MythicFrame is Turned Off
                </h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  The localhost server process and BEI Bridge have stopped completely. All ports have been released.
                </p>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-left max-w-sm mx-auto space-y-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-green-400" />
                  <span>Port 3488 (Web Server) closed</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-green-400" />
                  <span>Port 58925 (BEI Bridge) closed</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <i className="fa-solid fa-terminal text-purple-400" />
                  <span>To restart: <code className="text-purple-300 font-mono font-bold bg-purple-950/60 px-1.5 py-0.5 rounded">npm run dev</code></span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseTab}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                  <span>Close This Tab</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                You can also close this tab manually with <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Ctrl+W</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Cmd+W</kbd>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShutdownModal;
