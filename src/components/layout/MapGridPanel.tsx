
import React from 'react';
import { MapGridConfig, MapEnvironmentPreset, MapViewMode, MapLightDirection, MapDetailDensity, MapDecorationLevel } from '../../types';
import { MAP_ENVIRONMENT_PRESETS } from '../../constants/mapGrid';
import UnityInput from '../ui/UnityInput';

interface MapGridPanelProps {
  config: MapGridConfig;
  setConfig: (val: MapGridConfig | ((prev: MapGridConfig) => MapGridConfig)) => void;
}

const MapGridPanel: React.FC<MapGridPanelProps> = ({ config, setConfig }) => {
  const updateConfig = (updates: Partial<MapGridConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handlePresetChange = (presetId: string) => {
    const preset = MAP_ENVIRONMENT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      updateConfig({
        preset: presetId as MapEnvironmentPreset,
        primaryColor: preset.primary,
        accentColor: preset.accent
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* View Mode */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">View Mode</label>
        <div className="flex bg-[#161f32] rounded border border-slate-800 p-1">
          {(['top-down', 'isometric'] as MapViewMode[]).map(mode => (
            <button 
              key={mode}
              onClick={() => updateConfig({ viewMode: mode })}
              className={`flex-1 py-2 text-[10px] font-bold rounded transition-all uppercase ${config.viewMode === mode ? 'bg-[#2a3754] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {mode.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Settings */}
      <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <i className="fa-solid fa-border-all text-blue-400" /> Grid Settings
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          <UnityInput label="Width" value={config.gridWidth} onChange={v => updateConfig({ gridWidth: v })} min={10} max={200} step={1} />
          <UnityInput label="Height" value={config.gridHeight} onChange={v => updateConfig({ gridHeight: v })} min={10} max={200} step={1} />
        </div>
        
        <UnityInput label="Cell Size (px)" value={config.cellSize} onChange={v => updateConfig({ cellSize: v })} min={16} max={256} step={8} />

        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${config.showGrid ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-700'}`}>
              {config.showGrid && <i className="fa-solid fa-check text-[9px] text-white" />}
            </div>
            <input type="checkbox" className="sr-only" checked={config.showGrid} onChange={e => updateConfig({ showGrid: e.target.checked })} />
            <span className="text-[10px] font-bold text-slate-300 uppercase group-hover:text-white">Show Grid</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${config.snapToGrid ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-700'}`}>
              {config.snapToGrid && <i className="fa-solid fa-check text-[9px] text-white" />}
            </div>
            <input type="checkbox" className="sr-only" checked={config.snapToGrid} onChange={e => updateConfig({ snapToGrid: e.target.checked })} />
            <span className="text-[10px] font-bold text-slate-300 uppercase group-hover:text-white">Snap</span>
          </label>
        </div>

        {config.viewMode === 'isometric' && (
          <div className="space-y-3 pt-2 border-t border-slate-800/50 animate-in slide-in-from-top-1">
            <UnityInput label="Diamond Ratio" value={config.tileDiamondRatio} onChange={v => updateConfig({ tileDiamondRatio: v })} min={0.1} max={1.0} step={0.05} />
            <UnityInput label="Height Mult" value={config.verticalHeightMultiplier} onChange={v => updateConfig({ verticalHeightMultiplier: v })} min={0.5} max={3.0} step={0.1} />
          </div>
        )}
      </div>

      {/* Environment Preset */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Environment Preset</label>
        <div className="relative group">
          <select 
            value={config.preset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full bg-[#161f32] border border-slate-800 rounded px-4 py-3 text-sm text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-bold appearance-none"
          >
            {MAP_ENVIRONMENT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <i className="fa-solid fa-caret-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* Style Controls */}
      <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <i className="fa-solid fa-palette text-purple-400" /> Style Controls
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Floor</label>
            <div className="flex items-center gap-2 bg-[#0b1120] p-1.5 rounded border border-slate-800">
              <input type="color" value={config.primaryColor} onChange={e => updateConfig({ primaryColor: e.target.value })} className="w-6 h-6 rounded border-none bg-transparent cursor-pointer" />
              <span className="text-[9px] font-mono text-slate-400 uppercase">{config.primaryColor}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Accent</label>
            <div className="flex items-center gap-2 bg-[#0b1120] p-1.5 rounded border border-slate-800">
              <input type="color" value={config.accentColor} onChange={e => updateConfig({ accentColor: e.target.value })} className="w-6 h-6 rounded border-none bg-transparent cursor-pointer" />
              <span className="text-[9px] font-mono text-slate-400 uppercase">{config.accentColor}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Shadow Intensity</span>
            <span className="text-blue-300 font-mono text-[10px]">{config.shadowIntensity}%</span>
          </div>
          <input type="range" min="0" max="100" value={config.shadowIntensity} onChange={e => updateConfig({ shadowIntensity: parseInt(e.target.value) })} className="w-full accent-blue-600 h-1 bg-slate-950 rounded appearance-none cursor-pointer" />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-slate-500 uppercase">Light Direction</label>
          <select 
            value={config.lightDirection}
            onChange={(e) => updateConfig({ lightDirection: e.target.value as MapLightDirection })}
            className="w-full bg-[#0b1120] border border-slate-800 rounded px-3 py-2 text-[10px] text-slate-300 outline-none hover:border-slate-700 font-bold"
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Detail Density</label>
            <select 
              value={config.detailDensity}
              onChange={(e) => updateConfig({ detailDensity: e.target.value as MapDetailDensity })}
              className="w-full bg-[#0b1120] border border-slate-800 rounded px-3 py-2 text-[10px] text-slate-300 outline-none hover:border-slate-700 font-bold"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Decoration</label>
            <select 
              value={config.decorationLevel}
              onChange={(e) => updateConfig({ decorationLevel: e.target.value as MapDecorationLevel })}
              className="w-full bg-[#0b1120] border border-slate-800 rounded px-3 py-2 text-[10px] text-slate-300 outline-none hover:border-slate-700 font-bold"
            >
              <option value="none">None</option>
              <option value="light">Light</option>
              <option value="rich">Rich</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <i className="fa-solid fa-file-export text-blue-400" /> Export Settings
        </label>
        
        <UnityInput 
          label="Export Tile Size (px)" 
          value={config.exportTileSize} 
          onChange={v => updateConfig({ exportTileSize: v })} 
          min={16} 
          max={512} 
          step={8} 
          suffix="px"
        />

        <label className="flex items-center gap-3 cursor-pointer group pt-1">
          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${config.transparentBackground ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-700'}`}>
            {config.transparentBackground && <i className="fa-solid fa-check text-[9px] text-white" />}
          </div>
          <input type="checkbox" className="sr-only" checked={config.transparentBackground} onChange={e => updateConfig({ transparentBackground: e.target.checked })} />
          <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-white">Transparent BG</span>
        </label>
      </div>
    </div>
  );
};

export default MapGridPanel;
