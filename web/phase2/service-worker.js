/**
 * Squicky Player Service Worker
 * Provides offline support, caching, and performance optimization
 */

const CACHE_NAME = 'squicky-player-v2';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './themes.css',
  './enhanced-controls.css',
  './enhanced-controls.js',
  './optimized-playback.js',
  './theme-switcher.js',
  './compact-layout.css',
  './mobile-enhancements.css',
  './phase2/format-detector.js',
  './phase2/quality-manager.js',
  './phase2/media-info-panel.js',
  './phase2/playlist-manager.js',
  './phase2/subtitle-manager.js',
  './phase2/timeline-enhancements.js',
  './phase2/performance.js',
  './phase2/advanced-controls.js',
  './phase2/video-filters.js',
  './phase2-styles/quality-ui.css',
  './phase2-styles/media-info-panel.css',
  './phase2-styles/playlist-ui.css',
  './phase2-styles/subtitle-styles.css',
  './phase2-styles/timeline-ui.css',
  './phase2-styles/advanced-controls.css'
];

const STATIC_EXTENSIONS = ['.js', '.css', '.html', '.woff', '.woff2', '.ttf', '.svg', '.png', '.jpg', '.ico'];

// ─── Install Event ─────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('Service Worker: Some assets failed to precache', err);
          // Try adding assets individually so one failure does not block all
          return Promise.allSettled(
            PRECACHE_ASSETS.map(asset => cache.add(asset).catch(() => null))
          );
        });
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// ─── Activate Event ────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('Service Worker: Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

// ─── Fetch Event ───────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstWithFallback(request)
    );
    return;
  }

  // Static assets: cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      cacheFirst(request)
    );
    return;
  }

  // API and media requests: network-first strategy
  event.respondWith(
    networkFirst(request)
  );
});

// ─── Caching Strategies ────────────────────────────────────────────────

/**
 * Cache-first strategy for static assets
 * Returns cached version if available, falls back to network
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Optionally update cache in background
    updateCacheInBackground(request);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline - Asset not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Network-first strategy for dynamic content
 * Tries network first, falls back to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Network-first with offline fallback to index.html for navigation
 */
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Try to serve cached version of the requested page
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Fall back to cached index.html for offline navigation
    const fallback = await caches.match('./index.html');
    if (fallback) {
      return fallback;
    }

    return new Response('Offline - Page not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// ─── Utility Functions ─────────────────────────────────────────────────

/**
 * Check if a URL path refers to a static asset
 */
function isStaticAsset(pathname) {
  return STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

/**
 * Update cache in background without blocking the response
 */
function updateCacheInBackground(request) {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response);
        });
      }
    })
    .catch(() => {
      // Silently fail background updates
    });
}
