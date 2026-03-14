
import { secureFetch } from './api';

const CACHE_KEY_PREFIX = 'shopmaster_cache_';
const QUEUE_KEY = 'shopmaster_offline_queue';

export interface OfflineRequest {
  id: string;
  url: string;
  options: any;
  timestamp: number;
}

export const isOnline = () => navigator.onLine;

export const saveToCache = (url: string, data: any) => {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + url, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to save to cache', e);
  }
};

export const getFromCache = (url: string) => {
  const cached = localStorage.getItem(CACHE_KEY_PREFIX + url);
  if (cached) {
    try {
      const { data } = JSON.parse(cached);
      return data;
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const addToQueue = (url: string, options: any) => {
  const queue: OfflineRequest[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const newRequest: OfflineRequest = {
    id: Math.random().toString(36).substring(7),
    url,
    options,
    timestamp: Date.now()
  };
  queue.push(newRequest);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return newRequest;
};

export const getQueue = (): OfflineRequest[] => {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
};

export const removeFromQueue = (id: string) => {
  const queue = getQueue();
  const newQueue = queue.filter(req => req.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
};

export const syncOfflineQueue = async () => {
  if (!isOnline()) return;
  
  const queue = getQueue();
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} offline requests...`);
  
  for (const req of queue) {
    try {
      const response = await secureFetch(req.url, { ...req.options, _isSync: true });
      if (response.ok) {
        removeFromQueue(req.id);
      } else {
        // If it's a 4xx error, it might be invalid data, maybe remove it anyway?
        // For now, let's keep it if it's a 5xx error
        if (response.status < 500) {
          removeFromQueue(req.id);
        }
      }
    } catch (e) {
      console.error('Failed to sync request', req, e);
      break; // Stop syncing if we hit a network error again
    }
  }
  
  window.dispatchEvent(new CustomEvent('offline-sync-completed'));
};
