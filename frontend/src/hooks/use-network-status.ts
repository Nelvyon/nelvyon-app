import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook: monitors network connectivity and shows toast alerts.
 * Prevents data loss by warning users when offline.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    toast.success('Conexión restaurada', {
      description: 'Tu conexión a internet se ha restablecido.',
      duration: 3000,
    });
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast.error('Sin conexión', {
      description: 'Se ha perdido la conexión a internet. Los cambios no se guardarán.',
      duration: Infinity,
      id: 'offline-toast',
    });
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return isOnline;
}