import React, { useState } from 'react';
import { HistoryEntry, UIMode } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import ShutdownModal from '../ui/ShutdownModal';

interface DashboardProps {
  history: HistoryEntry[];
  onNavigate: (mode: UIMode) => void;
  onOpenShutdown?: () => void;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const Dashboard: React.FC<DashboardProps> = ({ history, onNavigate, onOpenShutdown }) => {
  const { t } = useLanguage();
  const [showInternalShutdownModal, setShowInternalShutdownModal] = useState(false);

  const handleTriggerShutdown = () => {
    if (onOpenShutdown) {
      onOpenShutdown();
    } else {
      setShowInternalShutdownModal(true);
    }
  };

  const recentArt = history.filter(h => h.mode === 'illustration').slice(0, 4);
  const totalGenerations = history.length;
  
  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header with Turn Off / Quit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900/80">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{t('welcome')}</h1>
            <p className="text-slate-400 text-sm md:text-base">{t('subtitle')}</p>
          </div>

          <button
            type="button"
            onClick={handleTriggerShutdown}
            className="self-start sm:self-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500/70 text-red-300 hover:text-white text-xs font-bold transition-all shadow-lg shadow-red-950/40 group cursor-pointer shrink-0"
            title="Turn Off MythicFrame Localhost Server"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 group-hover:scale-125 transition-transform animate-pulse" />
            <i className="fa-solid fa-power-off text-sm text-red-400 group-hover:text-white transition-colors" />
            <span>Turn Off Server</span>
          </button>
        </div>

        {/* Stats & Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Total Generations */}
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-purple-500/50 transition-colors">
              <span className="text-4xl font-bold text-white">{totalGenerations}</span>
              <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">{t('assets_created')}</span>
           </div>
           
           {/* Create Illustration */}
           <button 
             onClick={() => onNavigate('illustration')}
             className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-6 flex items-center justify-between hover:bg-purple-900/40 hover:border-purple-500/60 transition-all group cursor-pointer text-left"
           >
              <div>
                <div className="text-purple-300 font-bold mb-1">{t('create_illustration')}</div>
                <div className="text-purple-400/60 text-xs">{t('chars_scenes')}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-md shadow-purple-900/30">
                 <Icon name="fa-paintbrush" />
              </div>
           </button>

           {/* Character Bible */}
           <button 
             onClick={() => onNavigate('gacha')}
             className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 flex items-center justify-between hover:bg-blue-900/40 hover:border-blue-500/60 transition-all group cursor-pointer text-left"
           >
              <div>
                <div className="text-blue-300 font-bold mb-1">{t('gacha')}</div>
                <div className="text-blue-400/60 text-xs">Full Character Bibles</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 shadow-md shadow-blue-900/30">
                 <Icon name="fa-person-rays" />
              </div>
           </button>
        </div>

        {/* Recent Work */}
        <div>
           <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{t('recent_work')}</h2>
              <button onClick={() => onNavigate('library')} className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">{t('view_all')}</button>
           </div>
           
           {recentArt.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {recentArt.map(entry => (
                 <div key={entry.id} className="aspect-square rounded-lg overflow-hidden border border-slate-800 relative group">
                    <img src={entry.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                       <span className="text-xs text-white font-medium truncate">{entry.userPrompt}</span>
                       <span className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleDateString()}</span>
                    </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-600">
                <p>{t('no_recent')}</p>
                <button onClick={() => onNavigate('illustration')} className="mt-2 text-purple-400 font-medium hover:underline cursor-pointer">{t('start_creating')}</button>
             </div>
           )}
        </div>

      </div>

      {/* Standalone modal fallback if onOpenShutdown wasn't passed by parent */}
      {!onOpenShutdown && (
        <ShutdownModal
          isOpen={showInternalShutdownModal}
          onClose={() => setShowInternalShutdownModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
