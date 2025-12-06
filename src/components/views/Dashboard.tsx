
import React from 'react';
import { HistoryEntry, UIMode } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface DashboardProps {
  history: HistoryEntry[];
  onNavigate: (mode: UIMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ history, onNavigate }) => {
  const { t } = useLanguage();
  const recentArt = history.filter(h => h.mode === 'illustration').slice(0, 4);
  const totalGenerations = history.length;
  
  return (
    <div className="flex-1 bg-slate-950 p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">{t('welcome')}</h1>
          <p className="text-slate-400 text-lg">{t('subtitle')}</p>
        </div>

        {/* Stats & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-purple-500/50 transition-colors">
              <span className="text-4xl font-bold text-white">{totalGenerations}</span>
              <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">{t('assets_created')}</span>
           </div>
           
           <button 
             onClick={() => onNavigate('illustration')}
             className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-6 flex items-center justify-between hover:bg-purple-900/40 transition-all group"
           >
              <div className="text-left">
                <div className="text-purple-300 font-bold mb-1">{t('create_illustration')}</div>
                <div className="text-purple-400/60 text-xs">{t('chars_scenes')}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                 <i className="fa-solid fa-paintbrush" />
              </div>
           </button>

           <button 
             onClick={() => onNavigate('fullcard')}
             className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 flex items-center justify-between hover:bg-blue-900/40 transition-all group"
           >
              <div className="text-left">
                <div className="text-blue-300 font-bold mb-1">{t('design_card')}</div>
                <div className="text-blue-400/60 text-xs">{t('layout_comp')}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                 <i className="fa-solid fa-pen-ruler" />
              </div>
           </button>
        </div>

        {/* Recent Work */}
        <div>
           <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{t('recent_work')}</h2>
              <button onClick={() => onNavigate('library')} className="text-sm text-purple-400 hover:text-purple-300">{t('view_all')}</button>
           </div>
           
           {recentArt.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {recentArt.map(entry => (
                 <div key={entry.id} className="aspect-square rounded-lg overflow-hidden border border-slate-800 relative group">
                    <img src={entry.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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
                <button onClick={() => onNavigate('illustration')} className="mt-2 text-purple-400 font-medium hover:underline">{t('start_creating')}</button>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
