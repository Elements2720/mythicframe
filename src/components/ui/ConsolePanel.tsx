import React, { useState } from 'react';

interface ConsoleLogItemProps {
  log: string;
  index: number;
}

const ConsoleLogItem: React.FC<ConsoleLogItemProps> = ({ log, index }) => {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 group transition-all hover:border-slate-700">
       <div 
         className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/50 transition-colors select-none"
         onClick={() => setIsExpanded(!isExpanded)}
       >
          <div className="flex items-center gap-3">
             <div className={`w-5 h-5 rounded flex items-center justify-center bg-slate-800 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                <i className="fa-solid fa-chevron-right text-[10px] text-slate-400" />
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Generation Request #{index + 1}</span>
                <span className="text-[9px] text-slate-500 font-mono">Timestamp: {new Date().toLocaleTimeString()}</span>
             </div>
          </div>
          <button 
             onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(log);
             }}
             className="opacity-0 group-hover:opacity-100 text-[9px] font-black bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-600 hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"
          >
             <i className="fa-solid fa-copy" />
             Copy Prompt
          </button>
       </div>
       {isExpanded && (
          <div className="p-5 border-t border-slate-800 bg-black/40 animate-in slide-in-from-top-2 duration-300">
             <div className="text-[12px] text-green-400/80 whitespace-pre-wrap leading-relaxed font-mono selection:bg-purple-500/40 selection:text-white">
                {log}
             </div>
          </div>
       )}
    </div>
  );
};

interface ConsolePanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] bg-slate-950/95 border border-slate-800 z-[1000] flex flex-col font-mono shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
       <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3 text-purple-400 text-xs font-black px-2 tracking-widest">
             <i className="fa-solid fa-terminal text-sm" /> PROMPT CONSOLE
             <span className="text-[10px] text-slate-500 font-medium">| Debug & Inspection</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-slate-600 font-bold uppercase mr-2">{logs.length} Entries</span>
             <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all">
                <i className="fa-solid fa-times text-sm" />
             </button>
          </div>
       </div>
       <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
          {logs.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-600">
                <i className="fa-solid fa-ghost text-3xl opacity-20" />
                <div className="text-xs italic font-bold tracking-widest uppercase opacity-40">No generation logs yet...</div>
             </div>
          ) : (
             [...logs].reverse().map((log, i) => (
                <ConsoleLogItem key={logs.length - 1 - i} log={log} index={logs.length - 1 - i} />
             ))
          )}
       </div>
    </div>
  );
};

export default ConsolePanel;
