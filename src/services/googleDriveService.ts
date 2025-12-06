
// This service handles interactions with the Google Drive API via REST and GIS
// It relies purely on the Access Token (OAuth), removing the need for an API Key.

declare global {
  interface Window {
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const API_URL = 'https://www.googleapis.com/drive/v3/files';

let tokenClient: any = null;
let accessToken: string | null = null;
let storedClientId: string | null = null;

// 1. Initialize the GIS (Google Identity Services) Token Client
export const initDriveSystem = async (clientId: string) => {
  if (!window.google || !window.google.accounts) {
      throw new Error("Google Identity Services script not loaded in index.html");
  }

  storedClientId = clientId;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (tokenResponse: any) => {
      if (tokenResponse && tokenResponse.access_token) {
          accessToken = tokenResponse.access_token;
          // Trigger a custom event or callback if needed, but usually we await the promise in signIn
      }
    },
  });
};

// 2. Trigger Auth Flow (Popup)
export const signInToDrive = (): Promise<boolean> => {
   return new Promise((resolve, reject) => {
      if (!tokenClient) return reject("Drive system not initialized. Enter Client ID in Settings.");
      
      // Override callback to capture resolution for this specific request
      tokenClient.callback = (resp: any) => {
         if (resp.error) {
            console.error("Auth Error:", resp);
            reject(resp);
         }
         if (resp.access_token) {
            accessToken = resp.access_token;
            resolve(true);
         } else {
            resolve(false);
         }
      };

      // Request access (auto requests if previously granted, or popup)
      tokenClient.requestAccessToken({ prompt: '' });
   });
};

export const signOutFromDrive = async (): Promise<void> => {
  if (window.google && window.google.accounts && window.google.accounts.oauth2 && accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
          console.log("Token revoked");
      });
  }
  accessToken = null;
};

export const getDriveConnectionStatus = (): boolean => {
  return !!accessToken;
};

export const getAccessToken = (): string | null => accessToken;

// 3. List Folders (Replaces Picker API)
export interface DriveFolder {
  id: string;
  name: string;
}

export const listDriveFolders = async (parentId: string = 'root'): Promise<DriveFolder[]> => {
  if (!accessToken) throw new Error("Not authenticated");

  // Query: Only folders, inside parent, not trashed
  const query = `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id, name)',
    pageSize: '100',
    orderBy: 'name'
  });

  const response = await fetch(`${API_URL}?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
     const err = await response.json();
     throw new Error(err.error?.message || "Failed to list folders");
  }

  const data = await response.json();
  return data.files || [];
};

// 4. Create Folder
export const createDriveFolder = async (name: string, parentId: string = 'root'): Promise<DriveFolder> => {
  if (!accessToken) throw new Error("Not authenticated");

  const metadata = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
     const err = await response.json();
     throw new Error(err.error?.message || "Failed to create folder");
  }

  const file = await response.json();
  return { id: file.id, name: file.name };
};

// 5. Upload File
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return await res.blob();
};

export const uploadImageToDrive = async (
  base64Image: string, 
  filename: string, 
  targetFolderId?: string
): Promise<string> => {
  if (!accessToken) throw new Error("Not signed into Drive");

  let parentId = targetFolderId;

  // If no folder provided, try to find or create default in root
  if (!parentId) {
      // Simple check for default folder in root (not robust but a good fallback)
      const defaults = await listDriveFolders('root');
      const found = defaults.find(f => f.name === 'MythicFrame Exports');
      if (found) {
        parentId = found.id;
      } else {
        const newFolder = await createDriveFolder('MythicFrame Exports', 'root');
        parentId = newFolder.id;
      }
  }

  // Prepare Metadata
  const metadata = {
    name: filename.endsWith('.png') ? filename : `${filename}.png`,
    mimeType: 'image/png',
    parents: [parentId]
  };

  // Prepare Payload
  const blob = await base64ToBlob(base64Image);
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  // Upload
  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: form
  });

  const result = await response.json();
  if (result.error) throw new Error(result.error.message);
  
  return result.id;
};