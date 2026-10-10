/**
 * System Service for managing MythicFrame Localhost Server operations.
 */

export interface ShutdownResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function requestServerShutdown(): Promise<ShutdownResponse> {
  try {
    const res = await fetch('/api/system/shutdown', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Server responded with HTTP ${res.status}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      message: data.message || 'Server shutdown initiated.',
    };
  } catch (err: any) {
    // If the network request fails because the server immediately terminated its socket,
    // that means the shutdown succeeded.
    return {
      success: true,
      message: 'Server process terminated.',
    };
  }
}

export function openShutdownModal(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mythic_open_shutdown_modal'));
  }
}
