import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArtStyle, StyleCategory, StyleCollection } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { ART_STYLES, STYLE_CATEGORIES } from '../../constants';
import { generateStyleExample, analyzeImageStyle } from '../../services/geminiService';
import FullScreenPreview from '../ui/FullScreenPreview';

interface StyleLibraryProps {
  customStyles: ArtStyle[];
  styleCollections: StyleCollection[];
  activeCollectionId: string;
  activeStyleIds: string[];
  stylePreviews: Record<string, string>;
  onAdd: (style: Omit<ArtStyle, 'id' | 'isCustom'>) => void;
  onUpdate: (id: string, style: Partial<ArtStyle>) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onRemoveAll: () => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onAddCollection: (name: string) => void;
  onDeleteCollection: (id: string) => void;
  onUpdatePreview: (id: string, url: string) => void;
  setActiveCollectionId: (id: string) => void;
  isGenerating?: boolean;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const StyleLibrary: React.FC<StyleLibraryProps> = ({ 
  customStyles, styleCollections, activeCollectionId, activeStyleIds, stylePreviews, 
  onAdd, onUpdate, onDelete, onToggleActive, onRemoveAll, onReorder, onUpdatePreview,
  setActiveCollectionId, onAddCollection, onDeleteCollection,
  isGenerating = false
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddingStyle, setIsAddingStyle] = useState(false);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [isGeneratingExample, setIsGeneratingExample] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showLogicId, setShowLogicId] = useState<string | null>(null);
  const [showInfoId, setShowInfoId] = useState<string | null>(null);
  const [fullscreenPreviewUrl, setFullscreenPreviewUrl] = useState<string | null>(null);
  
  // Vision Architect State
  const [isArchitecting, setIsArchitecting] = useState(false);
  const [architectPreview, setArchitectPreview] = useState<string | null>(null);
  const [isArchitectDragOver, setIsArchitectDragOver] = useState(false);
  const architectFileInputRef = useRef<HTMLInputElement>(null);

  const [testSubject, setTestSubject] = useState(() => localStorage.getItem('mythic_style_test_subject') || "A majestic high-fantasy knight standing in a heroic pose, holding a glowing sword, detailed armor");

  useEffect(() => {
    localStorage.setItem('mythic_style_test_subject', testSubject);
  }, [testSubject]);

  const [styleFormData, setStyleFormData] = useState<{
    name: string;
    promptSnippet: string;
    description: string;
    category: StyleCategory;
  }>({ name: '', promptSnippet: '', description: '', category: 'Game Art' });

  const activeColObj = useMemo(() => 
    styleCollections.find(c => c.id === activeCollectionId) || styleCollections[0]
  , [styleCollections, activeCollectionId]);

  const handleStyleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleFormData.name || !styleFormData.promptSnippet) return;
    if (editingStyleId) onUpdate(editingStyleId, styleFormData);
    else onAdd(styleFormData);
    setEditingStyleId(null);
    setIsAddingStyle(false);
    setArchitectPreview(null);
    setStyleFormData({ name: '', promptSnippet: '', description: '', category: 'Game Art' });
  };

  const handleCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    onAddCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsAddingCollection(false);
  };

  const handleGeneratePreview = async (snippet: string, id: string) => {
    setIsGeneratingExample(id);
    try {
      const url = await generateStyleExample(snippet, testSubject);
      onUpdatePreview(id, url);
    } catch (e: any) { alert("Failed: " + e.message); } finally { setIsGeneratingExample(null); }
  };

  // Vision Architect Handler
  const handleArchitectImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setIsArchitecting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setArchitectPreview(base64);
      try {
        const analysis = await analyzeImageStyle(base64);
        setStyleFormData(prev => ({
          ...prev,
          description: analysis.description,
          promptSnippet: analysis.promptSnippet
        }));
      } catch (e: any) {
        alert("Vision analysis failed: " + e.message);
      } finally {
        setIsArchitecting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Fix: Added missing drag and drop handlers for Vision Architect
  const handleArchitectDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsArchitectDragOver(true);
  };

  const handleArchitectDragLeave = () => {
    setIsArchitectDragOver(false);
  };

  const handleArchitectDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsArchitectDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleArchitectImage(file);
  };

  const toggleTag = (tag: string) => setActiveTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);

  const filteredStyles = useMemo(() => {
    const all = [...ART_STYLES.filter(s => s.id !== 'none'), ...customStyles];
    return all.filter(s => {
      const matchesSearch = searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = activeTags.length === 0 || (s.category && activeTags.includes(s.category));
      return matchesSearch && matchesTags;
    });
  }, [searchQuery, activeTags, customStyles]);

  const sortedListStyles = useMemo(() => {
    return filteredStyles.filter(s => activeStyleIds.includes(s.id)).sort((a, b) => {
        const idxA = activeStyleIds.indexOf(a.id);
        const idxB = activeStyleIds.indexOf(b.id);
        return idxA - idxB;
    });
  }, [filteredStyles, activeStyleIds]);

  const StyleGridCard: React.FC<{ style: ArtStyle }> = ({ style }) => {
    const isActive = activeStyleIds.includes(style.id);
    const previewUrl = stylePreviews[style.id] || style.exampleUrl;
    const isProcessing = isGeneratingExample === style.id;
    const isCustom = !!style.isCustom;
    const showingLogic = showLogicId === style.id;
    const showingInfo = showInfoId === style.id;

    return (
      <div className={`bg-[#0b1120] border-2 rounded-2xl overflow-hidden transition-all relative shadow-xl flex flex-col group/card ${isActive ? 'border-purple-500 ring-4 ring-purple-500/10' : 'border-slate-800 hover:border-slate-700'}`}>
        <div className="relative aspect-video bg-slate-950 overflow-hidden shrink-0">
           {previewUrl ? (
             <img src={previewUrl} className="w-full h-full object-cover transition-transform group-hover/card:scale-105" />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-2">
                <Icon name="fa-image text-3xl opacity-20" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">No Preview</span>
             </div>
           )}
           
           {isProcessing && (
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <Icon name="fa-circle-notch fa-spin text-purple-500 text-3xl" />
                <span className="text-[10px] font-black text-purple-400 uppercase animate-pulse">Rendering Style</span>
             </div>
           )}

           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <div className="flex gap-2">
                 <button 
                   onClick={() => handleGeneratePreview(style.promptSnippet, style.id)}
                   disabled={isProcessing}
                   className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                 >
                   Regen Preview
                 </button>
                 {previewUrl && (
                   <button 
                     onClick={() => setFullscreenPreviewUrl(previewUrl)}
                     className="w-8 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-lg flex items-center justify-center border border-white/5"
                   >
                     <Icon name="fa-expand text-xs" />
                   </button>
                 )}
              </div>
           </div>

           <button 
             onClick={() => onToggleActive(style.id)}
             className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shadow-xl ${isActive ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/40 border-white/20 text-white/50 hover:border-white hover:text-white'}`}
           >
              <Icon name={isActive ? "fa-check" : "fa-plus"} className="text-xs" />
           </button>

           {isCustom && (
             <div className="absolute top-3 left-3 px-2 py-1 bg-purple-600 text-white text-[8px] font-black uppercase rounded shadow-lg">Custom</div>
           )}
        </div>

        <div className="p-4 flex-1 flex flex-col">
           <div className="flex justify-between items-start mb-2">
              <h3 className="font-black text-slate-100 text-sm truncate flex-1 pr-2">{style.name}</h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase">{style.category}</span>
           </div>
           
           <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 italic mb-4 flex-1">
             {style.description || 'No description available.'}
           </p>

           <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
              <div className="flex gap-2">
                 <button 
                   onClick={() => setShowLogicId(showingLogic ? null : style.id)}
                   className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${showingLogic ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                   title="Show Style Logic"
                 >
                    <Icon name="fa-code text-[10px]" />
                 </button>
              </div>
              
              {isCustom && (
                <div className="flex gap-2">
                   <button 
                     onClick={() => { setEditingStyleId(style.id); setStyleFormData({ name: style.name, promptSnippet: style.promptSnippet, description: style.description || '', category: style.category || 'Game Art' }); setIsAddingStyle(true); }}
                     className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-400 transition-colors"
                   >
                      <Icon name="fa-pencil text-[10px]" />
                   </button>
                   <button 
                     onClick={() => onDelete(style.id)}
                     className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                   >
                      <Icon name="fa-trash text-[10px]" />
                   </button>
                </div>
              )}
           </div>

           {showingLogic && (
             <div className="absolute inset-0 bg-slate-950/95 p-4 z-20 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-3">
                   <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Logic Fragment</span>
                   <button onClick={() => setShowLogicId(null)} className="text-slate-500 hover:text-white"><Icon name="fa-times text-xs" /></button>
                </div>
                <div className="bg-black/50 rounded-xl p-3 border border-blue-500/30 font-mono text-[10px] text-blue-100/70 h-[calc(100%-30px)] overflow-y-auto custom-scrollbar break-words">
                   {style.promptSnippet}
                </div>
             </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-[#0b1120] flex flex-col overflow-hidden font-sans">
      <FullScreenPreview isOpen={!!fullscreenPreviewUrl} onClose={() => setFullscreenPreviewUrl(null)} imageUrl={fullscreenPreviewUrl} />
      
      {/* Header Area */}
      <div className="h-20 bg-slate-900/50 border-b border-slate-800 flex items-center px-8 gap-8 shrink-0 z-30 shadow-2xl">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-500 border border-purple-500/20">
               <Icon name="fa-palette text-xl" />
            </div>
            <div>
               <h1 className="text-lg font-black text-white uppercase tracking-widest">Style Architect</h1>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Blueprint Library</p>
            </div>
         </div>

         <div className="h-8 w-px bg-slate-800" />

         <div className="flex-1 max-w-md relative group">
            <Icon name="fa-magnifying-glass" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-500 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Blueprints..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-200 focus:border-purple-500/50 outline-none transition-all" 
            />
         </div>

         <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAddingStyle(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-900/30 transition-all active:scale-95 flex items-center gap-2"
            >
               <Icon name="fa-plus" /> New Style
            </button>
            <button 
              onClick={() => setIsAddingCollection(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-slate-700"
            >
               New List
            </button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
         {/* Sidebar: Lists & Filters */}
         <div className="w-72 border-r border-slate-800 bg-[#0b1120] flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
               
               {/* Collection List */}
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Active Style Lists</h3>
                  <div className="space-y-1.5">
                     {styleCollections.map(col => (
                        <div key={col.id} className="group relative">
                           <button 
                             onClick={() => setActiveCollectionId(col.id)}
                             className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${activeCollectionId === col.id ? 'bg-purple-600/10 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:bg-slate-800 border border-transparent'}`}
                           >
                              <div className="flex items-center gap-3 min-w-0">
                                 <Icon name={activeCollectionId === col.id ? "fa-folder-open" : "fa-folder"} className="text-xs shrink-0" />
                                 <span className="text-xs font-bold truncate">{col.name}</span>
                              </div>
                              <span className="text-[10px] font-black opacity-40">{col.styleIds.length}</span>
                           </button>
                           {!col.isLocked && (
                             <button 
                               onClick={() => onDeleteCollection(col.id)}
                               className="absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-900/50 text-red-400 border border-red-500/30 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                             >
                                <Icon name="fa-times text-[10px]" />
                             </button>
                           )}
                        </div>
                     ))}
                  </div>
               </div>

               {/* Categories */}
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Filter Category</h3>
                  <div className="flex flex-wrap gap-2 px-1">
                     {STYLE_CATEGORIES.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => toggleTag(cat)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTags.includes(cat) ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                        >
                           {cat}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Subject Preview Controller */}
               <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Preview Subject</h3>
                  <textarea 
                    value={testSubject} 
                    onChange={e => setTestSubject(e.target.value)}
                    className="w-full h-20 bg-transparent text-[11px] text-slate-300 italic outline-none resize-none leading-relaxed custom-scrollbar" 
                    placeholder="Enter subject for style tests..."
                  />
                  <div className="mt-2 text-[8px] text-slate-600 uppercase font-black tracking-tighter">Affects all Regen Previews</div>
               </div>
            </div>
         </div>

         {/* Main Content Area */}
         <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
            
            {/* Toolbar for the List */}
            <div className="h-14 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
               <div className="flex items-center gap-4">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                     <Icon name="fa-layer-group text-purple-500" /> 
                     {activeColObj.name} 
                     <span className="bg-slate-800 px-2 py-0.5 rounded text-white">{sortedListStyles.length}</span>
                  </h2>
               </div>

               <div className="flex items-center gap-6">
                  {!activeColObj.isLocked && (
                    <button 
                      onClick={onRemoveAll}
                      className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                    >
                       Clear List
                    </button>
                  )}
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                     <button onClick={() => setViewMode('grid')} className={`w-8 h-8 rounded flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="fa-th-large" /></button>
                     <button onClick={() => setViewMode('list')} className={`w-8 h-8 rounded flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="fa-list" /></button>
                  </div>
               </div>
            </div>

            {/* Scrollable Gallery */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               {viewMode === 'grid' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredStyles.map((style) => (
                      <StyleGridCard key={style.id} style={style} />
                    ))}
                 </div>
               ) : (
                 <div className="max-w-5xl mx-auto space-y-3">
                    {filteredStyles.map(style => {
                       const isActive = activeStyleIds.includes(style.id);
                       return (
                         <div key={style.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isActive ? 'bg-purple-900/10 border-purple-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                            <div className="w-20 h-14 rounded-lg bg-black overflow-hidden shrink-0">
                               {stylePreviews[style.id] && <img src={stylePreviews[style.id]} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-white">{style.name}</span>
                                  {style.isCustom && <span className="text-[8px] bg-purple-600 px-1 rounded font-black text-white uppercase">User</span>}
                               </div>
                               <p className="text-[10px] text-slate-500 italic truncate">{style.description || 'No description.'}</p>
                            </div>
                            {!activeColObj.isLocked && isActive && (
                              <div className="flex gap-1">
                                 <button onClick={() => onReorder(style.id, 'up')} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-500 hover:text-white flex items-center justify-center"><Icon name="fa-chevron-up text-[10px]" /></button>
                                 <button onClick={() => onReorder(style.id, 'down')} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-500 hover:text-white flex items-center justify-center"><Icon name="fa-chevron-down text-[10px]" /></button>
                              </div>
                            )}
                            <button 
                              onClick={() => onToggleActive(style.id)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                            >
                               {isActive ? 'Active' : 'Enable'}
                            </button>
                         </div>
                       );
                    })}
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* --- ADD / EDIT STYLE DIALOG --- */}
      {isAddingStyle && (
         <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-[900px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
               <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xl shadow-purple-900/30">
                        <Icon name="fa-wand-magic-sparkles text-lg" />
                     </div>
                     <h2 className="text-xl font-black text-white uppercase tracking-widest">{editingStyleId ? 'Edit Style Blueprint' : 'Architect New Style'}</h2>
                  </div>
                  <button onClick={() => setIsAddingStyle(false)} className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors flex items-center justify-center"><Icon name="fa-times text-lg" /></button>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar flex min-h-0">
                  {/* Left: Input Form */}
                  <form onSubmit={handleStyleSubmit} className="w-1/2 p-8 space-y-6 border-r border-slate-800">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Blueprint Name</label>
                        <input 
                           type="text" 
                           value={styleFormData.name} 
                           onChange={e => setStyleFormData({...styleFormData, name: e.target.value})} 
                           placeholder="e.g. Crystalline Steampunk" 
                           className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-all"
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Style Category</label>
                        <div className="flex flex-wrap gap-2 pt-1">
                           {STYLE_CATEGORIES.map(cat => (
                              <button 
                                key={cat} 
                                type="button" 
                                onClick={() => setStyleFormData({...styleFormData, category: cat as StyleCategory})}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${styleFormData.category === cat ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                              >
                                 {cat}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logic Fragment (Prompt)</label>
                           <span className="text-[9px] text-purple-400 font-bold">Injected into SUBJECT</span>
                        </div>
                        <textarea 
                           value={styleFormData.promptSnippet} 
                           onChange={e => setStyleFormData({...styleFormData, promptSnippet: e.target.value})} 
                           placeholder=", cinematic digital painting, sharp neon edges, bioluminescent accents..." 
                           className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-blue-100 font-mono focus:border-blue-500 outline-none transition-all resize-none custom-scrollbar"
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Documentation (Description)</label>
                        <textarea 
                           value={styleFormData.description} 
                           onChange={e => setStyleFormData({...styleFormData, description: e.target.value})} 
                           placeholder="Brief summary of visual traits..." 
                           className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 italic focus:border-purple-500 outline-none transition-all resize-none custom-scrollbar"
                        />
                     </div>

                     <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsAddingStyle(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-500 hover:text-white transition-colors">Abort</button>
                        <button type="submit" className="flex-[2] bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/30 transition-all active:scale-95">Save Blueprint</button>
                     </div>
                  </form>

                  {/* Right: Vision Architect / Preview */}
                  <div className="w-1/2 bg-slate-950 p-8 flex flex-col">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Icon name="fa-eye text-blue-500" /> Vision Architect</h3>
                        <span className="text-[9px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded font-black uppercase">Gemini Vision v3</span>
                     </div>
                     
                     <div 
                       onDragOver={handleArchitectDragOver}
                       onDragLeave={handleArchitectDragLeave}
                       onDrop={handleArchitectDrop}
                       className={`flex-1 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center gap-4 group/drop relative overflow-hidden ${isArchitectDragOver ? 'bg-blue-600/10 border-blue-500 shadow-2xl scale-102' : 'bg-slate-900 border-slate-800'}`}
                     >
                        {isArchitecting ? (
                           <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                              <Icon name="fa-wand-magic-sparkles fa-spin text-4xl text-blue-500" />
                              <div>
                                 <p className="text-sm font-black text-white uppercase tracking-widest">Analyzing Aesthetic</p>
                                 <p className="text-[10px] text-slate-500 mt-1">Decoding rendering techniques...</p>
                              </div>
                           </div>
                        ) : architectPreview ? (
                           <div className="absolute inset-0 group">
                              <img src={architectPreview} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-8 gap-4">
                                 <Icon name="fa-image-portrait text-3xl text-white/50" />
                                 <button type="button" onClick={() => architectFileInputRef.current?.click()} className="bg-white text-slate-900 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl">Swap Reference</button>
                                 <p className="text-[10px] text-slate-300 leading-relaxed italic">The AI extracts keywords from this image to populate your logic fragment.</p>
                              </div>
                           </div>
                        ) : (
                           <>
                              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 group-hover/drop:bg-blue-600/20 group-hover/drop:text-blue-500 transition-all shadow-xl">
                                 <Icon name="fa-cloud-arrow-up text-2xl" />
                              </div>
                              <div>
                                 <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Architect via Image</p>
                                 <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Drop a reference image here.<br/>AI will auto-generate the description and fragment.</p>
                              </div>
                              <button type="button" onClick={() => architectFileInputRef.current?.click()} className="mt-4 bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all">Select Image</button>
                           </>
                        )}
                        <input type="file" ref={architectFileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleArchitectImage(e.target.files[0])} />
                     </div>
                     
                     <div className="mt-6 p-4 bg-slate-900 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                           <Icon name="fa-circle-info text-slate-500 text-xs" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Architect Tip</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                           Upload a high-polish character render to extract complex materials like "iridescent silk" or "weathered brass plating" for your style logic.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- ADD COLLECTION DIALOG --- */}
      {isAddingCollection && (
         <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-[400px] shadow-2xl">
               <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">Create Style List</h2>
               <form onSubmit={handleCollectionSubmit} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">List Name</label>
                     <input 
                        type="text" 
                        value={newCollectionName} 
                        onChange={e => setNewCollectionName(e.target.value)} 
                        placeholder="e.g. Boss Fights, Item Shop..." 
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                     />
                  </div>
                  <div className="flex gap-3 pt-2">
                     <button type="button" onClick={() => setIsAddingCollection(false)} className="flex-1 py-3 text-xs font-black text-slate-500 hover:text-white uppercase transition-colors">Cancel</button>
                     <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">Create List</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default StyleLibrary;