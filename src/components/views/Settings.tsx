
import React, { useState, useEffect } from 'react';
import { GameContext } from '../../types';
import { initDriveSystem, signInToDrive, signOutFromDrive, getDriveConnectionStatus } from '../../services/googleDriveService';
import { verifyManualApiKey } from '../../services/geminiService';
import { APP_VERSION } from '../../constants';
import { useLanguage } from '../../i18n/LanguageContext';

interface SettingsProps {
  gameContext: GameContext;
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>;
  apiKeyReady: boolean;
  onConnect: () => void;
  onRefreshKey?: () => void;
  driveFolderId?: string;
  setDriveFolderId?: (id: string) => void;
  driveFolderName?: string;
  setDriveFolderName?: (name: string) => void;
  onOpenFolderPicker?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  gameContext, setGameContext, apiKeyReady, onConnect, onRefreshKey,
  driveFolderId, setDriveFolderId, driveFolderName, setDriveFolderName, onOpenFolderPicker
}) => {
  const { language, setLanguage, t } = useLanguage();

  // Drive State
  const [driveClientId, setDriveClientId] = useState(localStorage.getItem('mythic_drive_client_id') || '');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveStatus, setDriveStatus] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [originUrl, setOriginUrl] = useState('');

  // Manual API Key State
  const [manualKey, setManualKey] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setOriginUrl(window.location.origin);
    }
    if (getDriveConnectionStatus()) {
        setDriveConnected(true);
    }
  }, []);

  const handleDriveInit = async () => {
    if (!driveClientId) {
      setDriveStatus('Please enter Client ID.');
      return;
    }
    
    setIsInitializing(true);
    setDriveStatus('Initializing...');
    try {
      localStorage.setItem('mythic_drive_client_id', driveClientId);
      
      await initDriveSystem(driveClientId);
      
      const connected = await signInToDrive();
      setDriveConnected(connected);
      setDriveStatus(connected ? 'Connected!' : 'Connection cancelled.');
    } catch (e: any) {
      console.error(e);
      setDriveStatus(`Error: ${e.message || e.error || 'Unknown error'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDriveDisconnect = async () => {
    await signOutFromDrive();
    setDriveConnected(false);
    setDriveStatus('Disconnected.');
  };

  const copyOrigin = () => {
     navigator.clipboard.writeText(originUrl);
  };

  const handleManualVerify = async () => {
     if(!manualKey.trim()) return;
     setIsVerifying(true);
     const isValid = await verifyManualApiKey(manualKey.trim());
     setIsVerifying(false);
     
     if(isValid) {
        localStorage.setItem('mythic_api_key', manualKey.trim());
        if(onRefreshKey) onRefreshKey();
        setShowManualInput(false);
        setManualKey('');
     } else {
        alert("Invalid API Key. Please check the key and try again.");
     }
  };

  const clearManualKey = () => {
     if(confirm("Remove manual API key?")) {
        localStorage.removeItem('mythic_api_key');
        if(onRefreshKey) onRefreshKey();
     }
  };

  const isUsingEnv = apiKeyReady && typeof localStorage !== 'undefined' && !localStorage.getItem('mythic_api_key') && !!process.env.API_KEY;

  return (
    <div className="flex-1 bg-slate-950 p-10 overflow-y-auto">
       <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
             <div>
               <h2 className="text-2xl font-bold text-white mb-1">{t('settings')}</h2>
               <p className="text-slate-400 text-sm">Configure global settings for your generated assets.</p>
             </div>
             
             {/* Language Selector */}
             <div className="flex flex-col items-end">
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">{t('language')}</label>
                <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
                   <button 
                      onClick={() => setLanguage('en')} 
                      className={`px-3 py-1 text-xs rounded transition-colors ${language === 'en' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                   >
                      English
                   </button>
                   <button 
                      onClick={() => setLanguage('ru')} 
                      className={`px-3 py-1 text-xs rounded transition-colors ${language === 'ru' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                   >
                      Русский
                   </button>
                </div>
             </div>
          </div>

          {/* Game Context Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 shrink-0">
                   <i className="fa-solid fa-book" />
                </div>
                <div className="flex-1">
                   <h3 className="text-lg font-bold text-slate-200 mb-2">{t('game_context')}</h3>
                   <p className="text-sm text-slate-400 mb-4">
                      {t('context_desc')}
                   </p>
                   
                   <div className="space-y-4">
                       <div>
                          <label className="block text-xs uppercase font-bold text-slate-500 mb-1">{t('setting_world')}</label>
                          <textarea 
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm h-24 text-slate-200 focus:border-blue-500 outline-none resize-none"
                            placeholder="e.g. A cozy alchemy shop in a medieval village. Wooden shelves, warm candlelight, bubbling potions."
                            value={gameContext.setting}
                            onChange={e => setGameContext(p => ({...p, setting: e.target.value}))}
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs uppercase font-bold text-slate-500 mb-1">{t('tone_mood')}</label>
                              <input 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                placeholder="e.g. Whimsical, warm"
                                value={gameContext.tone}
                                onChange={e => setGameContext(p => ({...p, tone: e.target.value}))}
                              />
                          </div>
                          <div>
                              <label className="block text-xs uppercase font-bold text-slate-500 mb-1">{t('visual_constraints')}</label>
                              <input 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                placeholder="e.g. No sci-fi, no neon"
                                value={gameContext.visualConstraints}
                                onChange={e => setGameContext(p => ({...p, visualConstraints: e.target.value}))}
                              />
                          </div>
                       </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Gemini API Key Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center text-amber-500 shrink-0">
                   <i className="fa-solid fa-key" />
                </div>
                <div className="flex-1">
                   <h3 className="text-lg font-bold text-slate-200 mb-2">{t('api_connection')}</h3>
                   <p className="text-sm text-slate-400 mb-4">
                      Manage your connection to Google Gemini. Required for Pro models and high-quality generation.
                   </p>
                   
                   <div className="flex flex-col gap-4">
                       <div className="flex items-center gap-4">
                          <div className={`px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 border ${apiKeyReady ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>
                             <i className={`fa-solid ${apiKeyReady ? 'fa-check-circle' : 'fa-times-circle'}`} />
                             {apiKeyReady ? 'Connected' : 'Not Connected'}
                          </div>
                          <button 
                             onClick={onConnect}
                             className="text-sm text-slate-300 hover:text-white underline"
                          >
                             {apiKeyReady ? 'Change Key (Google)' : 'Connect with Google'}
                          </button>
                       </div>

                       {isUsingEnv && (
                           <div className="text-xs text-green-400 flex items-center gap-2 bg-green-900/10 p-2 rounded border border-green-500/20">
                               <i className="fa-solid fa-code" /> Connected via Environment Variable (API_KEY)
                           </div>
                       )}

                       {/* Manual Key Input Option */}
                       {!showManualInput && !isUsingEnv && (
                          <div className="text-xs text-slate-500">
                             Or <button onClick={() => setShowManualInput(true)} className="text-blue-400 hover:underline">enter API key manually</button>
                          </div>
                       )}
                       
                       {!showManualInput && isUsingEnv && (
                          <div className="text-xs text-slate-500">
                             Need to override? <button onClick={() => setShowManualInput(true)} className="text-blue-400 hover:underline">Enter manual API key</button>
                          </div>
                       )}

                       {/* Manual Input Form */}
                       {showManualInput && (
                           <div className="bg-slate-950 border border-slate-800 rounded p-3 animate-in fade-in slide-in-from-top-2">
                               <div className="flex gap-2 items-center">
                                   <input 
                                      type="password" 
                                      value={manualKey} 
                                      onChange={e => setManualKey(e.target.value)} 
                                      placeholder="Paste Gemini API Key..."
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                   />
                                   <button 
                                      onClick={handleManualVerify}
                                      disabled={isVerifying || !manualKey}
                                      className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded text-sm font-bold disabled:opacity-50 min-w-[80px]"
                                   >
                                      {isVerifying ? '...' : 'Verify'}
                                   </button>
                                   <button onClick={() => setShowManualInput(false)} className="text-slate-500 hover:text-white px-2">
                                      <i className="fa-solid fa-times" />
                                   </button>
                               </div>
                               <p className="text-[10px] text-slate-500 mt-2">
                                  Your key is stored locally in your browser.
                               </p>
                           </div>
                       )}

                       {/* Clear Manual Key Option */}
                       {apiKeyReady && typeof localStorage !== 'undefined' && localStorage.getItem('mythic_api_key') && (
                           <div className="text-xs text-slate-500 bg-slate-800/50 p-2 rounded border border-slate-700/50 flex justify-between items-center">
                               <span><i className="fa-solid fa-keyboard mr-1" /> Using manual API key</span>
                               <button onClick={clearManualKey} className="text-red-400 hover:underline">Remove & Use Default</button>
                           </div>
                       )}
                   </div>
                </div>
             </div>
          </div>

          {/* Google Drive Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center text-green-500 shrink-0">
                   <i className="fa-brands fa-google-drive" />
                </div>
                <div className="flex-1">
                   <h3 className="text-lg font-bold text-slate-200 mb-2">{t('drive_integration')}</h3>
                   <p className="text-sm text-slate-400 mb-4">
                      Save generated assets directly to a Google Drive folder.
                      <br/>
                      <span className="text-slate-500 text-xs mt-1 block">
                        Requires a Google Cloud Project with the <b>Google Drive API</b> enabled.
                        <br/>
                        You only need to provide a Client ID. No API Key required.
                      </span>
                      <a 
                        href="https://console.cloud.google.com/apis/credentials" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-3 border border-blue-500/30 bg-blue-900/20 px-3 py-1.5 rounded transition-colors"
                      >
                         <i className="fa-solid fa-arrow-up-right-from-square" /> Get Client ID
                      </a>
                   </p>
                   
                   {!driveConnected ? (
                      <div className="space-y-4">
                         
                         {/* Config Helper for User */}
                         <div className="bg-slate-800/50 rounded border border-slate-700 p-3 text-xs">
                             <div className="text-slate-300 font-bold mb-1 flex items-center gap-2">
                                <i className="fa-solid fa-circle-info text-blue-400"/> Google Console Configuration
                             </div>
                             <p className="text-slate-500 mb-2">
                                When creating your "Web application" credential, copy this URL into <b>Authorized JavaScript origins</b>:
                             </p>
                             <div className="flex gap-2 items-start">
                                <code className="flex-1 bg-black/30 border border-slate-700 rounded px-2 py-1.5 font-mono text-green-400 break-all whitespace-normal select-all">
                                   {originUrl}
                                </code>
                                <button onClick={copyOrigin} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors shrink-0 h-full">
                                   Copy
                                </button>
                             </div>
                             <p className="text-slate-600 mt-2 italic">
                                Note: You can leave <b>Authorized redirect URIs</b> blank.
                             </p>
                         </div>

                         <div>
                             <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Client ID</label>
                             <input 
                                type="text"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-green-500 outline-none"
                                placeholder="...apps.googleusercontent.com"
                                value={driveClientId}
                                onChange={(e) => setDriveClientId(e.target.value)}
                             />
                         </div>
                         <button 
                            onClick={handleDriveInit}
                            disabled={isInitializing}
                            className="bg-white hover:bg-slate-200 text-slate-900 px-4 py-2 rounded font-bold text-sm shadow-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                         >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-4 h-4" />
                            {isInitializing ? 'Connecting...' : 'Sign in with Google'}
                         </button>
                      </div>
                   ) : (
                      <div className="bg-green-900/10 border border-green-500/20 rounded p-4 space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                                <i className="fa-solid fa-check-circle" /> Connected to Drive
                             </div>
                             <button onClick={handleDriveDisconnect} className="text-xs text-slate-500 hover:text-red-400 underline">Disconnect</button>
                          </div>
                          
                          <div className="space-y-2">
                             <label className="block text-xs uppercase font-bold text-slate-500">Destination Folder</label>
                             <div className="flex gap-2">
                                <div className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 flex items-center gap-2">
                                   <i className="fa-regular fa-folder" />
                                   {driveFolderName || 'Default (MythicFrame Exports)'}
                                </div>
                                <button 
                                   onClick={onOpenFolderPicker}
                                   className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold transition-colors"
                                >
                                   Change
                                </button>
                             </div>
                          </div>
                      </div>
                   )}
                   
                   {driveStatus && !driveConnected && (
                      <div className={`text-xs mt-2 ${driveStatus.includes('Error') ? 'text-red-400' : 'text-slate-400'}`}>
                         {driveStatus}
                      </div>
                   )}
                </div>
             </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-900 text-center">
             <p className="text-xs text-slate-600 font-mono">MythicFrame v{APP_VERSION}</p>
          </div>

       </div>
    </div>
  );
};

export default Settings;
