// Service Worker for ContentLab Nexus
// Implements aggressive caching strategy for performance optimization

const CACHE_NAME = 'contentlab-nexus-v1';
const STATIC_CACHE = 'static-cache-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';
const API_CACHE = 'api-cache-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/dashboard',
  '/api/analytics',
  '/api/projects',
  '/api/teams',
];

// Cache strategies
const CACHE_STRATEGIES = {
  'cache-first': ['css', 'js', 'fonts', 'images'],
  'network-first': ['html', 'api'],
  'stale-while-revalidate': ['api/dashboard', 'api/analytics'],
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('[SW] Preparing API cache');
        return Promise.resolve();
      })
    ])
  );
  
  // Force immediate activation
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Chrome extension requests
  if (request.url.startsWith('chrome-extension://')) return;
  
  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Static assets - cache first
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // HTML requests - network first with cache fallback
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(handleHtmlRequest(request));
    return;
  }
  
  // Default - network first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const cacheName = API_CACHE;
  const cache = await caches.open(cacheName);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API, serving from cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page or error response
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback to network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle HTML requests
async function handleHtmlRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return app shell or offline page
    return cache.match('/');
  }
}

// Helper function to identify static assets
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.includes(ext)) || url.includes('fonts.googleapis.com');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle any queued offline actions
  console.log('[SW] Processing background sync');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || 'contentlab-notification',
        data: data.data || {},
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CACHE_ANALYTICS':
        cacheAnalyticsData(event.data.payload);
        break;
      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

async function cacheAnalyticsData(data) {
  const cache = await caches.open(API_CACHE);
  const response = new Response(JSON.stringify(data));
  await cache.put('/api/analytics/cached', response);
}