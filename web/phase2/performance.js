/**
 * Performance Manager Module
 * Lazy loading, virtual scrolling, memory management, thumbnail caching, preload optimization
 */

class PerformanceManager {
  constructor(options = {}) {
    this.options = {
      thumbnailCacheLimit: options.thumbnailCacheLimit || 100,
      thumbnailTTL: options.thumbnailTTL || 7 * 24 * 60 * 60 * 1000, // 7 days
      thumbnailMemoryLimit: options.thumbnailMemoryLimit || 50,
      cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5 minutes
      virtualScrollItemHeight: options.virtualScrollItemHeight || 72,
      virtualScrollBuffer: options.virtualScrollBuffer || 5,
      dbName: options.dbName || 'squicky-player-cache',
      dbVersion: options.dbVersion || 1,
      ...options
    };

    this.objectURLs = new Set();
    this.thumbnailMemoryCache = new Map();
    this.db = null;
    this.observers = new Map();
    this.cleanupTimer = null;
    this.features = this.detectFeatures();

    this._init();
  }

  /**
   * Initialize performance systems
   */
  async _init() {
    if (this.features.indexedDB) {
      await this._openDatabase();
    }
    this._startPeriodicCleanup();

    window.dispatchEvent(new CustomEvent('performance:ready', {
      detail: { features: this.features }
    }));
  }

  // ─── Progressive Enhancement Detection ─────────────────────────────

  /**
   * Detect available browser features for progressive enhancement
   */
  detectFeatures() {
    return {
      intersectionObserver: typeof IntersectionObserver !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      webWorker: typeof Worker !== 'undefined',
      networkInformation: 'connection' in navigator,
      requestIdleCallback: 'requestIdleCallback' in window,
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      webGL: this._checkWebGL(),
      performanceObserver: typeof PerformanceObserver !== 'undefined',
      mediaCapabilities: 'mediaCapabilities' in navigator
    };
  }

  _checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
    } catch (e) {
      return false;
    }
  }

  // ─── Lazy Loading (IntersectionObserver) ────────────────────────────

  /**
   * Set up lazy loading for playlist items using IntersectionObserver
   * @param {HTMLElement} container - The scrollable container
   * @param {Object} options - Observer options
   */
  setupLazyLoading(container, options = {}) {
    if (!this.features.intersectionObserver) {
      // Fallback: render all items immediately
      this._renderAllItems(container);
      return;
    }

    const observerOptions = {
      root: options.root || container,
      rootMargin: options.rootMargin || '200px 0px',
      threshold: options.threshold || 0.01
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this._loadPlaylistItem(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    this.observers.set(container, observer);

    // Observe all placeholder items
    const items = container.querySelectorAll('[data-lazy]');
    items.forEach(item => observer.observe(item));

    return observer;
  }

  /**
   * Load a lazily-deferred playlist item
   */
  _loadPlaylistItem(element) {
    const src = element.dataset.lazySrc;
    const thumbnail = element.dataset.lazyThumbnail;

    if (thumbnail) {
      const img = element.querySelector('.playlist-item-thumbnail');
      if (img) {
        img.src = thumbnail;
        img.classList.add('loaded');
      }
    }

    if (src) {
      element.dataset.src = src;
    }

    element.removeAttribute('data-lazy');
    element.classList.add('lazy-loaded');

    window.dispatchEvent(new CustomEvent('performance:lazyload', {
      detail: { element }
    }));
  }

  _renderAllItems(container) {
    const items = container.querySelectorAll('[data-lazy]');
    items.forEach(item => this._loadPlaylistItem(item));
  }

  /**
   * Destroy lazy loading observer for a container
   */
  destroyLazyLoading(container) {
    const observer = this.observers.get(container);
    if (observer) {
      observer.disconnect();
      this.observers.delete(container);
    }
  }

  // ─── Virtual Scrolling ──────────────────────────────────────────────

  /**
   * Initialize virtual scrolling for a large playlist
   * @param {HTMLElement} container - Scrollable container element
   * @param {Array} items - Full list of items
   * @param {Function} renderItem - Function that returns DOM element for an item
   */
  createVirtualScroll(container, items, renderItem) {
    const state = {
      container,
      items,
      renderItem,
      itemHeight: this.options.virtualScrollItemHeight,
      buffer: this.options.virtualScrollBuffer,
      totalHeight: items.length * this.options.virtualScrollItemHeight,
      visibleStart: 0,
      visibleEnd: 0,
      renderedNodes: new Map()
    };

    // Create scroll structure
    const viewport = document.createElement('div');
    viewport.className = 'virtual-scroll-viewport';
    viewport.style.position = 'relative';
    viewport.style.overflow = 'auto';
    viewport.style.height = '100%';

    const spacer = document.createElement('div');
    spacer.className = 'virtual-scroll-spacer';
    spacer.style.height = `${state.totalHeight}px`;
    spacer.style.position = 'relative';

    const content = document.createElement('div');
    content.className = 'virtual-scroll-content';
    content.style.position = 'absolute';
    content.style.top = '0';
    content.style.left = '0';
    content.style.right = '0';

    spacer.appendChild(content);
    viewport.appendChild(spacer);
    container.innerHTML = '';
    container.appendChild(viewport);

    state.viewport = viewport;
    state.spacer = spacer;
    state.content = content;

    // Bind scroll handler
    const onScroll = this._throttle(() => {
      this._updateVirtualScroll(state);
    }, 16);

    viewport.addEventListener('scroll', onScroll, { passive: true });
    state.scrollHandler = onScroll;

    // Initial render
    this._updateVirtualScroll(state);

    return {
      update: (newItems) => {
        state.items = newItems;
        state.totalHeight = newItems.length * state.itemHeight;
        state.spacer.style.height = `${state.totalHeight}px`;
        this._updateVirtualScroll(state);
      },
      destroy: () => {
        viewport.removeEventListener('scroll', onScroll);
        state.renderedNodes.clear();
        container.innerHTML = '';
      },
      scrollToIndex: (index) => {
        viewport.scrollTop = index * state.itemHeight;
      }
    };
  }

  _updateVirtualScroll(state) {
    const scrollTop = state.viewport.scrollTop;
    const viewportHeight = state.viewport.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / state.itemHeight) - state.buffer);
    const endIndex = Math.min(
      state.items.length - 1,
      Math.ceil((scrollTop + viewportHeight) / state.itemHeight) + state.buffer
    );

    // Only re-render if visible window changed
    if (startIndex === state.visibleStart && endIndex === state.visibleEnd) {
      return;
    }

    state.visibleStart = startIndex;
    state.visibleEnd = endIndex;

    // Clear existing content
    state.content.innerHTML = '';
    state.renderedNodes.clear();

    // Position content using transform
    const offsetY = startIndex * state.itemHeight;
    state.content.style.transform = `translateY(${offsetY}px)`;

    // Render visible items
    for (let i = startIndex; i <= endIndex; i++) {
      const node = state.renderItem(state.items[i], i);
      node.style.height = `${state.itemHeight}px`;
      node.style.boxSizing = 'border-box';
      state.content.appendChild(node);
      state.renderedNodes.set(i, node);
    }

    window.dispatchEvent(new CustomEvent('performance:virtualscroll', {
      detail: { startIndex, endIndex, totalItems: state.items.length }
    }));
  }

  // ─── Memory Management ──────────────────────────────────────────────

  /**
   * Create and track an Object URL for memory management
   */
  createObjectURL(blob) {
    const url = URL.createObjectURL(blob);
    this.objectURLs.add(url);
    return url;
  }

  /**
   * Revoke a specific Object URL
   */
  revokeObjectURL(url) {
    if (this.objectURLs.has(url)) {
      URL.revokeObjectURL(url);
      this.objectURLs.delete(url);
    }
  }

  /**
   * Revoke all tracked Object URLs
   */
  revokeAllObjectURLs() {
    this.objectURLs.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.objectURLs.clear();
  }

  /**
   * Enforce memory limits on thumbnail cache
   */
  _enforceThumbnailMemoryLimit() {
    if (this.thumbnailMemoryCache.size > this.options.thumbnailMemoryLimit) {
      const entries = [...this.thumbnailMemoryCache.entries()];
      // Remove oldest entries (first inserted)
      const toRemove = entries.slice(0, entries.length - this.options.thumbnailMemoryLimit);
      toRemove.forEach(([key]) => {
        this.thumbnailMemoryCache.delete(key);
      });
    }
  }

  /**
   * Periodic cleanup of resources
   */
  _startPeriodicCleanup() {
    this.cleanupTimer = setInterval(() => {
      this._performCleanup();
    }, this.options.cleanupInterval);
  }

  _performCleanup() {
    // Enforce thumbnail memory limit
    this._enforceThumbnailMemoryLimit();

    // Clean expired thumbnails from IndexedDB
    if (this.db) {
      this._cleanExpiredThumbnails();
    }

    window.dispatchEvent(new CustomEvent('performance:cleanup', {
      detail: {
        objectURLCount: this.objectURLs.size,
        memoryCacheSize: this.thumbnailMemoryCache.size
      }
    }));
  }

  // ─── Thumbnail Caching (IndexedDB) ─────────────────────────────────

  /**
   * Open IndexedDB database for thumbnail caching
   */
  _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, this.options.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('thumbnails')) {
          const store = db.createObjectStore('thumbnails', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.warn('PerformanceManager: IndexedDB not available', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Generate a cache key for a thumbnail
   */
  _thumbnailKey(filename, size) {
    return `${filename}_${size}`;
  }

  /**
   * Store a thumbnail in the cache
   * @param {string} filename - Source filename
   * @param {string} size - Size descriptor (e.g., '160x90')
   * @param {string} base64Data - Base64-encoded thumbnail data
   */
  async cacheThumbnail(filename, size, base64Data) {
    const key = this._thumbnailKey(filename, size);

    // Store in memory cache
    this.thumbnailMemoryCache.set(key, base64Data);
    this._enforceThumbnailMemoryLimit();

    // Store in IndexedDB
    if (!this.db) return;

    try {
      const tx = this.db.transaction('thumbnails', 'readwrite');
      const store = tx.objectStore('thumbnails');

      // Enforce max entries limit
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result >= this.options.thumbnailCacheLimit) {
          // Remove oldest entries
          const index = store.index('timestamp');
          const cursorReq = index.openCursor();
          let removed = 0;
          const toRemove = countReq.result - this.options.thumbnailCacheLimit + 1;

          cursorReq.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor && removed < toRemove) {
              cursor.delete();
              removed++;
              cursor.continue();
            }
          };
        }
      };

      store.put({
        key,
        filename,
        size,
        data: base64Data,
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('PerformanceManager: Failed to cache thumbnail', err);
    }
  }

  /**
   * Get a cached thumbnail
   * @param {string} filename - Source filename
   * @param {string} size - Size descriptor
   * @returns {Promise<string|null>} Base64 thumbnail data or null
   */
  async getThumbnail(filename, size) {
    const key = this._thumbnailKey(filename, size);

    // Check memory cache first
    if (this.thumbnailMemoryCache.has(key)) {
      return this.thumbnailMemoryCache.get(key);
    }

    // Check IndexedDB
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('thumbnails', 'readonly');
        const store = tx.objectStore('thumbnails');
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            // Check TTL
            if (Date.now() - result.timestamp > this.options.thumbnailTTL) {
              this._deleteThumbnail(key);
              resolve(null);
            } else {
              // Promote to memory cache
              this.thumbnailMemoryCache.set(key, result.data);
              this._enforceThumbnailMemoryLimit();
              resolve(result.data);
            }
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }

  _deleteThumbnail(key) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('thumbnails', 'readwrite');
      const store = tx.objectStore('thumbnails');
      store.delete(key);
    } catch (err) {
      // Silently fail
    }
  }

  /**
   * Clean expired thumbnails from IndexedDB
   */
  async _cleanExpiredThumbnails() {
    if (!this.db) return;

    try {
      const tx = this.db.transaction('thumbnails', 'readwrite');
      const store = tx.objectStore('thumbnails');
      const index = store.index('timestamp');
      const expiredBefore = Date.now() - this.options.thumbnailTTL;

      const range = IDBKeyRange.upperBound(expiredBefore);
      const cursorReq = index.openCursor(range);

      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (err) {
      console.warn('PerformanceManager: Failed to clean expired thumbnails', err);
    }
  }

  /**
   * Clear all cached thumbnails
   */
  async clearThumbnailCache() {
    this.thumbnailMemoryCache.clear();

    if (!this.db) return;

    try {
      const tx = this.db.transaction('thumbnails', 'readwrite');
      const store = tx.objectStore('thumbnails');
      store.clear();
    } catch (err) {
      console.warn('PerformanceManager: Failed to clear thumbnail cache', err);
    }
  }

  // ─── Preload Optimization ───────────────────────────────────────────

  /**
   * Get current connection info for adaptive preloading
   */
  getConnectionInfo() {
    if (!this.features.networkInformation) {
      return { effectiveType: '4g', downlink: 10, saveData: false };
    }

    const conn = navigator.connection;
    return {
      effectiveType: conn.effectiveType || '4g',
      downlink: conn.downlink || 10,
      saveData: conn.saveData || false,
      rtt: conn.rtt || 0
    };
  }

  /**
   * Determine preload strategy based on connection
   */
  getPreloadStrategy() {
    const conn = this.getConnectionInfo();

    if (conn.saveData) {
      return { preload: 'none', quality: 'low', prefetchNext: false };
    }

    switch (conn.effectiveType) {
      case 'slow-2g':
      case '2g':
        return { preload: 'none', quality: 'low', prefetchNext: false };
      case '3g':
        return { preload: 'metadata', quality: 'medium', prefetchNext: false };
      case '4g':
      default:
        return { preload: 'metadata', quality: 'high', prefetchNext: true };
    }
  }

  /**
   * Preload the next playlist item intelligently
   * @param {string} src - URL of the next media item
   */
  preloadNext(src) {
    const strategy = this.getPreloadStrategy();

    if (!strategy.prefetchNext) {
      return null;
    }

    // Use link preload for metadata
    const existingLink = document.querySelector(`link[href="${src}"]`);
    if (existingLink) return existingLink;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = src;

    if (strategy.preload === 'metadata') {
      // Use fetch for just metadata
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
    }

    document.head.appendChild(link);

    window.dispatchEvent(new CustomEvent('performance:preload', {
      detail: { src, strategy }
    }));

    return link;
  }

  /**
   * Cancel preload for a source
   */
  cancelPreload(src) {
    const link = document.querySelector(`link[href="${src}"]`);
    if (link) {
      link.remove();
    }
  }

  // ─── Utility Methods ────────────────────────────────────────────────

  _throttle(fn, delay) {
    let lastCall = 0;
    let timeoutId = null;

    return function (...args) {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;

      if (timeSinceLastCall >= delay) {
        lastCall = now;
        fn.apply(this, args);
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          fn.apply(this, args);
        }, delay - timeSinceLastCall);
      }
    };
  }

  /**
   * Run a task during idle time
   */
  runWhenIdle(callback, timeout = 2000) {
    if (this.features.requestIdleCallback) {
      return requestIdleCallback(callback, { timeout });
    }
    return setTimeout(callback, 100);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      objectURLCount: this.objectURLs.size,
      thumbnailMemoryCacheSize: this.thumbnailMemoryCache.size,
      features: this.features,
      connectionInfo: this.getConnectionInfo(),
      preloadStrategy: this.getPreloadStrategy()
    };
  }

  /**
   * Destroy the performance manager and clean up all resources
   */
  destroy() {
    // Stop periodic cleanup
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Revoke all Object URLs
    this.revokeAllObjectURLs();

    // Clear memory cache
    this.thumbnailMemoryCache.clear();

    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    window.dispatchEvent(new CustomEvent('performance:destroyed'));
  }
}

// Attach to window
window.PerformanceManager = PerformanceManager;
