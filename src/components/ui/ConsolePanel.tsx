import React from 'react';

interface ConsolePanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-0 bottom-0 w-[500px] bg-black/95 border-l border-slate-800 z-50 flex flex-col font-mono shadow-2xl animate-in slide-in-from-right">
       <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-green-400 text-xs font-bold px-2">
             <i className="fa-solid fa-terminal" /> PROMPT CONSOLE
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white px-2">
             <i className="fa-solid fa-times" />
          </button>
       </div>
       <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {logs.length === 0 ? (
             <div className="text-slate-600 text-xs italic">Waiting for generation...</div>
          ) : (
             logs.map((log, i) => (
                <div key={i} className="text-xs space-y-1 border-b border-slate-800/50 pb-4 last:border-0">
                   <div className="text-slate-500">[{new Date().toLocaleTimeString()}] Request Sent:</div>
                   <div className="text-green-300 whitespace-pre-wrap leading-relaxed">{log}</div>
                </div>
             ))
          )}
       </div>
    </div>
  );
};

export default ConsolePanel;