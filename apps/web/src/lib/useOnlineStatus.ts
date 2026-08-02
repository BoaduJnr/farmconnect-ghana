import { useEffect, useState } from 'react';

/** Tracks browser connectivity so the UI can tell a farmer/buyer they're looking at cached
 * data rather than silently showing stale results as if they were live (see PWA runtime
 * caching in vite.config.ts). */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
