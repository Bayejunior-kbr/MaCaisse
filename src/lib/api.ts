
import { getFromCache, saveToCache, addToQueue, isOnline } from './offline';

export async function secureFetch(url: string, options: any = {}) {
  const token = localStorage.getItem('token');
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const isSync = options._isSync === true;
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  // If offline and it's a GET request, try to return from cache
  if (!isOnline() && isGet) {
    const cachedData = getFromCache(url);
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Offline-Cache': 'true' }
      });
    }
  }

  // If offline and it's a mutation, add to queue (unless it's already a sync attempt)
  if (!isOnline() && !isGet && !isSync) {
    addToQueue(url, options);
    return new Response(JSON.stringify({ message: 'Request queued for offline sync', offline: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      const data = await response.clone().json().catch(() => ({}));
      if (data.error === "Invalid or expired token" || data.error === "Unauthorized" || response.status === 403) {
        if (response.status === 403 && data.error) {
          alert(data.error);
        }
        window.dispatchEvent(new CustomEvent('auth-error'));
      }
    }

    // Cache successful GET responses
    if (response.ok && isGet) {
      const clone = response.clone();
      clone.json().then(data => saveToCache(url, data)).catch(() => {});
    }

    return response;
  } catch (error) {
    // If fetch fails (network error), try cache for GET
    if (isGet) {
      const cachedData = getFromCache(url);
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Offline-Cache': 'true' }
        });
      }
    }
    
    // For mutations, queue them (unless it's already a sync attempt)
    if (!isGet && !isSync) {
      addToQueue(url, options);
      return new Response(JSON.stringify({ message: 'Network error, request queued', offline: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw error;
  }
}
