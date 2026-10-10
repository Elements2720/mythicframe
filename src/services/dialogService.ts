/**
 * In-App Dialog Service
 * Replaces native browser alert(), confirm(), and prompt() with sleek in-app modals.
 */

export interface DialogRequest {
  id: string;
  type: 'confirm' | 'alert' | 'prompt';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  isDestructive?: boolean;
  resolve: (value: any) => void;
}

type DialogListener = (dialog: DialogRequest | null) => void;

let currentDialog: DialogRequest | null = null;
const listeners = new Set<DialogListener>();

export const subscribeDialog = (listener: DialogListener): (() => void) => {
  listeners.add(listener);
  listener(currentDialog);
  return () => {
    listeners.delete(listener);
  };
};

const notify = () => {
  listeners.forEach(l => l(currentDialog));
};

export const showInAppConfirm = (
  message: string,
  options?: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  }
): Promise<boolean> => {
  return new Promise((resolve) => {
    currentDialog = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'confirm',
      title: options?.title || 'Confirmation',
      message,
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel',
      isDestructive: options?.isDestructive ?? true,
      resolve: (val: boolean) => {
        currentDialog = null;
        notify();
        resolve(val);
      }
    };
    notify();
  });
};

export const showInAppAlert = (
  message: string,
  options?: {
    title?: string;
    confirmText?: string;
    isDestructive?: boolean;
  }
): Promise<void> => {
  return new Promise((resolve) => {
    currentDialog = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'alert',
      title: options?.title || 'Notice',
      message,
      confirmText: options?.confirmText || 'OK',
      isDestructive: options?.isDestructive ?? false,
      resolve: () => {
        currentDialog = null;
        notify();
        resolve();
      }
    };
    notify();
  });
};

export const showInAppPrompt = (
  message: string,
  defaultValue = '',
  options?: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
  }
): Promise<string | null> => {
  return new Promise((resolve) => {
    currentDialog = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'prompt',
      title: options?.title || 'Input Required',
      message,
      confirmText: options?.confirmText || 'Submit',
      cancelText: options?.cancelText || 'Cancel',
      defaultValue,
      resolve: (val: string | null) => {
        currentDialog = null;
        notify();
        resolve(val);
      }
    };
    notify();
  });
};
