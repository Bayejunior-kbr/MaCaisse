
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { isOnline, syncOfflineQueue, getQueue } from '../lib/offline';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineStatus: React.FC = () => {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(getQueue().length);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setOnline(false);
    const handleSyncCompleted = () => {
      setSyncing(false);
      setQueueLength(getQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-completed', handleSyncCompleted);

    // Initial sync if online
    if (online) {
      syncOfflineQueue();
    }

    const interval = setInterval(() => {
      setQueueLength(getQueue().length);
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-completed', handleSyncCompleted);
      clearInterval(interval);
    };
  }, [online]);

  const handleManualSync = async () => {
    if (!online) return;
    setSyncing(true);
    await syncOfflineQueue();
    setSyncing(false);
  };

  return (
    <AnimatePresence>
      {(!online || queueLength > 0) && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg border ${
            online 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          {online ? (
            <Wifi size={18} className="text-emerald-500" />
          ) : (
            <WifiOff size={18} className="text-amber-500" />
          )}
          
          <span className="text-sm font-medium">
            {online 
              ? (queueLength > 0 ? `${queueLength} actions en attente` : 'En ligne')
              : 'Mode hors-ligne'}
          </span>

          {online && queueLength > 0 && (
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className={`p-1 hover:bg-emerald-100 rounded-full transition-colors ${syncing ? 'animate-spin' : ''}`}
              title="Synchroniser maintenant"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
