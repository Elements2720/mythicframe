import React, { useEffect, useCallback } from 'react';

/**
 * Hook to provide backdrop click-outside and ESC key dismiss functionality for any modal.
 */
export function useModalDismiss(isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
    },
    [onClose]
  );

  return { handleBackdropClick };
}

export default useModalDismiss;
