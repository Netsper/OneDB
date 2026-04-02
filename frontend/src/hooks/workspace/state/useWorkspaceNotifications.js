import { useCallback } from 'react';

export default function useWorkspaceNotifications({ setToasts, t }) {
  const showToast = useCallback(
    (message, type = 'success') => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3000);
    },
    [setToasts],
  );

  const copyToClipboard = useCallback(
    (text) => {
      navigator.clipboard.writeText(text);
      showToast(t('copied'), 'success');
    },
    [showToast, t],
  );

  return {
    showToast,
    copyToClipboard,
  };
}
