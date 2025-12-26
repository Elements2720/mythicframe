
import React, { useEffect, useState } from 'react';
import { listDriveFolders, createDriveFolder, DriveFolder } from '../../services/googleDriveService';

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string, folderName: string) => void;
}

interface Breadcrumb {
  id: string;
  name: string;
}

const FolderPickerModal: React.FC<FolderPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState<Breadcrumb[]>([{ id: 'root', name: 'My Drive' }]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const currentFolder = path[path.length - 1];

  useEffect(() => {
    if (isOpen) {
      loadFolders(currentFolder.id);
    }
  }, [isOpen, currentFolder]);

  const loadFolders = async (parentId: string) => {
    setLoading(true);
    try {
      const list = await listDriveFolders(parentId);
      setFolders(list);
      setSelectedId(null); // Reset selection on nav
    } catch (e) {
      console.error(e);
      alert("Failed to load folders. Make sure you are signed in.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (folder: DriveFolder) => {
    setPath([...path, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateUp = (index: number) => {
    setPath(path.slice(0, index + 1));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreating(true);
    try {
      const newFolder = await createDriveFolder(newFolderName, currentFolder.id);
      setFolders([newFolder, ...folders]);
      setNewFolderName('');
    } catch (e) {
      alert("Failed to create folder");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirm = () => {
    // If a subfolder is selected, use that. Otherwise use current directory.
    if (selectedId) {
      const f = folders.find(f => f.id === selectedId);
      if (f) onSelect(f.id, f.name);
    } else {
      onSelect(currentFolder.id, currentFolder.name);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[500px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
           <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <i className="fa-brands fa-google-drive text-green-500" /> Select Folder
           </h3>
           <button onClick={onClose} className="text-slate-500 hover:text-white"><i className="fa-solid fa-times" /></button>
        </div>

        {/* Breadcrumbs */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex gap-1 text-xs overflow-x-auto whitespace-nowrap custom-scrollbar">
           {path.map((crumb, idx) => (
              <div key={crumb.id} className="flex items-center text-slate-400">
                 {idx > 0 && <span className="mx-1 text-slate-600">/</span>}
                 <button 
                    onClick={() => handleNavigateUp(idx)}
                    className="hover:text-blue-400 hover:underline"
                 >
                    {crumb.name}
                 </button>
              </div>
           ))}
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-2 bg-slate-950 min-h-[300px]">
           {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                 <i className="fa-solid fa-circle-notch fa-spin" /> Loading...
              </div>
           ) : (
              <div className="space-y-1">
                 {folders.length === 0 && (
                    <div className="text-center text-slate-600 py-10 text-xs italic">
                       No subfolders found.
                    </div>
                 )}
                 {folders.map(folder => (
                    <div 
                       key={folder.id}
                       onClick={() => setSelectedId(folder.id === selectedId ? null : folder.id)}
                       onDoubleClick={() => handleNavigate(folder)}
                       className={`flex items-center justify-between p-2 rounded cursor-pointer border ${selectedId === folder.id ? 'bg-blue-900/30 border-blue-500/50' : 'border-transparent hover:bg-slate-800'}`}
                    >
                       <div className="flex items-center gap-3 text-sm text-slate-200">
                          <i className={`fa-solid fa-folder ${selectedId === folder.id ? 'text-blue-400' : 'text-slate-500'}`} />
                          {folder.name}
                       </div>
                       <button 
                          onClick={(e) => { e.stopPropagation(); handleNavigate(folder); }}
                          className="text-slate-500 hover:text-white px-2"
                       >
                          <i className="fa-solid fa-chevron-right text-xs" />
                       </button>
                    </div>
                 ))}
              </div>
           )}
        </div>

        {/* Create New */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
            <input 
              type="text" 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New Folder Name"
              className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
            />
            <button 
              onClick={handleCreateFolder}
              disabled={isCreating || !newFolderName}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 disabled:opacity-50"
            >
               <i className="fa-solid fa-plus" /> Create
            </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
           <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
           <button 
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold text-sm"
           >
              Select {selectedId ? 'Highlighed' : 'This Folder'}
           </button>
        </div>

      </div>
    </div>
  );
};

export default FolderPickerModal;
