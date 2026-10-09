/**
 * Privacy & Incognito / Streamer Mode Service
 * When Incognito Mode is ON, emails and identifying handles are safely masked
 * (e.g. "alex.turner@gmail.com" -> "al***r@gmail.com") to protect creator privacy
 * during livestreams, tutorial recordings, and shared workspaces.
 * When Incognito Mode is OFF (default), the real full email is shown.
 */

const INCOGNITO_MODE_KEY = 'mythic_incognito_mode';

export const getIncognitoMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(INCOGNITO_MODE_KEY) === 'true';
  }
  return false;
};

export const setIncognitoMode = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(INCOGNITO_MODE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent('mythic_incognito_mode_changed', { detail: enabled }));
    window.dispatchEvent(new Event('storage'));
  }
};

export const formatDisplayEmail = (email: string | undefined | null, incognito = false): string => {
  if (!email || typeof email !== 'string') return '';
  const clean = email.trim();
  if (clean.includes('example.com') || !clean.includes('@')) return '';
  
  if (!incognito) return clean;

  const [username, domain] = clean.split('@');
  if (!domain) return clean;

  if (username.length <= 2) {
    return `${username[0]}*@${domain}`;
  } else if (username.length <= 4) {
    return `${username[0]}**${username[username.length - 1]}@${domain}`;
  } else {
    return `${username.slice(0, 2)}***${username.slice(-1)}@${domain}`;
  }
};
