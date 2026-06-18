/**
 * Phase 2 Bootstrap - Initializes all Phase 2 modules and wires up inter-module communication.
 * This script must load LAST after all other Phase 2 modules.
 */
(function () {
  'use strict';

  class Phase2Bootstrap {
    constructor() {
      this.modules = {};
      this.mediaElement = null;
      this.playerElement = null;
      this.initialized = false;
    }

    /**
     * Initialize all Phase 2 modules with graceful degradation.
     * Each module is wrapped in try/catch so failures are isolated.
     */
    init() {
      if (this.initialized) return;
      this.initialized = true;

      // Find the media element
      this.playerElement = document.querySelector('squicky-player#player') || document.getElementById('player');
      this.mediaElement = this._findMediaElement();

      // Initialize modules
      this._initFormatDetector();
      this._initQualityManager();
      this._initMediaInfoPanel();
      this._initPlaylistManager();
      this._initSubtitleManager();
      this._initTimelineEnhancements();
      this._initPerformanceManager();
      this._initAdvancedControls();
      this._initVideoFilters();
      this._initAnalytics();

      // Wire up UI button handlers
      this._setupButtonHandlers();

      // Set up inter-module communication
      this._setupInterModuleCommunication();

      // Register service worker
      this._registerServiceWorker();

      console.log('[Phase2Bootstrap] All modules initialized successfully.');
    }

    /**
     * Find the video/audio media element inside the player.
     */
    _findMediaElement() {
      if (this.playerElement) {
        // Check shadow root first
        if (this.playerElement.shadowRoot) {
          const video = this.playerElement.shadowRoot.querySelector('video');
          if (video) return video;
          const audio = this.playerElement.shadowRoot.querySelector('audio');
          if (audio) return audio;
        }
        // Check regular DOM inside player
        const video = this.playerElement.querySelector('video');
        if (video) return video;
        const audio = this.playerElement.querySelector('audio');
        if (audio) return audio;
      }
      // Fallback to any video/audio on page
      return document.querySelector('video') || document.querySelector('audio');
    }

    _initFormatDetector() {
      try {
        if (window.FormatDetector) {
          this.modules.formatDetector = new window.FormatDetector();
          console.log('[Phase2Bootstrap] FormatDetector initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] FormatDetector failed to initialize:', e.message);
      }
    }

    _initQualityManager() {
      try {
        if (window.QualityManager) {
          this.modules.qualityManager = new window.QualityManager(this.mediaElement);
          console.log('[Phase2Bootstrap] QualityManager initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] QualityManager failed to initialize:', e.message);
      }
    }

    _initMediaInfoPanel() {
      try {
        if (window.MediaInfoPanel) {
          this.modules.mediaInfoPanel = new window.MediaInfoPanel(this.mediaElement, this.modules.formatDetector);
          console.log('[Phase2Bootstrap] MediaInfoPanel initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] MediaInfoPanel failed to initialize:', e.message);
      }
    }

    _initPlaylistManager() {
      try {
        if (window.PlaylistManager) {
          this.modules.playlistManager = new window.PlaylistManager(this.playerElement);
          console.log('[Phase2Bootstrap] PlaylistManager initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] PlaylistManager failed to initialize:', e.message);
      }
    }

    _initSubtitleManager() {
      try {
        if (window.SubtitleManager) {
          this.modules.subtitleManager = new window.SubtitleManager(this.mediaElement);
          console.log('[Phase2Bootstrap] SubtitleManager initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] SubtitleManager failed to initialize:', e.message);
      }
    }

    _initTimelineEnhancements() {
      try {
        if (window.TimelineEnhancements) {
          this.modules.timelineEnhancements = new window.TimelineEnhancements(this.mediaElement);
          console.log('[Phase2Bootstrap] TimelineEnhancements initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] TimelineEnhancements failed to initialize:', e.message);
      }
    }

    _initPerformanceManager() {
      try {
        if (window.PerformanceManager) {
          this.modules.performanceManager = new window.PerformanceManager();
          console.log('[Phase2Bootstrap] PerformanceManager initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] PerformanceManager failed to initialize:', e.message);
      }
    }

    _initAdvancedControls() {
      try {
        if (window.AdvancedControls) {
          this.modules.advancedControls = new window.AdvancedControls(this.mediaElement);
          console.log('[Phase2Bootstrap] AdvancedControls initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] AdvancedControls failed to initialize:', e.message);
      }
    }

    _initVideoFilters() {
      try {
        if (window.VideoFilters) {
          this.modules.videoFilters = new window.VideoFilters(this.mediaElement);
          console.log('[Phase2Bootstrap] VideoFilters initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] VideoFilters failed to initialize:', e.message);
      }
    }

    _initAnalytics() {
      try {
        if (window.AnalyticsManager) {
          this.modules.analytics = new window.AnalyticsManager(this.mediaElement);
          console.log('[Phase2Bootstrap] AnalyticsManager initialized.');
        }
      } catch (e) {
        console.warn('[Phase2Bootstrap] AnalyticsManager failed to initialize:', e.message);
      }
    }

    /**
     * Wire up button click handlers for Phase 2 UI elements.
     */
    _setupButtonHandlers() {
      // Playlist toggle button
      const playlistToggle = document.getElementById('playlistToggle');
      if (playlistToggle) {
        playlistToggle.addEventListener('click', () => {
          try {
            if (this.modules.playlistManager && typeof this.modules.playlistManager.togglePanel === 'function') {
              this.modules.playlistManager.togglePanel();
            } else {
              window.dispatchEvent(new CustomEvent('playlist:toggle'));
            }
          } catch (e) {
            console.warn('[Phase2Bootstrap] Playlist toggle error:', e.message);
          }
        });
      }

      // Analytics/Stats toggle button
      const analyticsToggle = document.getElementById('analyticsToggle');
      if (analyticsToggle) {
        analyticsToggle.addEventListener('click', () => {
          try {
            if (this.modules.analytics && typeof this.modules.analytics.toggleDashboard === 'function') {
              this.modules.analytics.toggleDashboard();
            } else {
              window.dispatchEvent(new CustomEvent('analytics:toggle'));
            }
          } catch (e) {
            console.warn('[Phase2Bootstrap] Analytics toggle error:', e.message);
          }
        });
      }

      // Media Info button
      const mediaInfoButton = document.getElementById('mediaInfoButton');
      if (mediaInfoButton) {
        mediaInfoButton.addEventListener('click', () => {
          try {
            if (this.modules.mediaInfoPanel && typeof this.modules.mediaInfoPanel.show === 'function') {
              this.modules.mediaInfoPanel.show();
            } else if (this.modules.mediaInfoPanel && typeof this.modules.mediaInfoPanel.toggle === 'function') {
              this.modules.mediaInfoPanel.toggle();
            } else {
              window.dispatchEvent(new CustomEvent('mediainfo:toggle'));
            }
          } catch (e) {
            console.warn('[Phase2Bootstrap] Media info toggle error:', e.message);
          }
        });
      }

      // Video Filters button
      const filtersButton = document.getElementById('filtersButton');
      if (filtersButton) {
        filtersButton.addEventListener('click', () => {
          try {
            if (this.modules.videoFilters && typeof this.modules.videoFilters.togglePanel === 'function') {
              this.modules.videoFilters.togglePanel();
            } else if (this.modules.videoFilters && typeof this.modules.videoFilters.toggle === 'function') {
              this.modules.videoFilters.toggle();
            } else {
              window.dispatchEvent(new CustomEvent('filters:toggle'));
            }
          } catch (e) {
            console.warn('[Phase2Bootstrap] Filters toggle error:', e.message);
          }
        });
      }

      // Advanced Controls button
      const advancedControlsButton = document.getElementById('advancedControlsButton');
      if (advancedControlsButton) {
        advancedControlsButton.addEventListener('click', () => {
          try {
            if (this.modules.advancedControls && typeof this.modules.advancedControls.togglePanel === 'function') {
              this.modules.advancedControls.togglePanel();
            } else if (this.modules.advancedControls && typeof this.modules.advancedControls.toggle === 'function') {
              this.modules.advancedControls.toggle();
            } else {
              window.dispatchEvent(new CustomEvent('advancedcontrols:toggle'));
            }
          } catch (e) {
            console.warn('[Phase2Bootstrap] Advanced controls toggle error:', e.message);
          }
        });
      }
    }

    /**
     * Set up inter-module communication via CustomEvents.
     */
    _setupInterModuleCommunication() {
      // When playlist advances to a new track, notify analytics of new session
      window.addEventListener('playlist:trackchange', (e) => {
        try {
          if (this.modules.analytics && typeof this.modules.analytics.newSession === 'function') {
            this.modules.analytics.newSession(e.detail);
          } else if (this.modules.analytics && typeof this.modules.analytics.trackEvent === 'function') {
            this.modules.analytics.trackEvent('track_change', e.detail);
          }
        } catch (err) {
          console.warn('[Phase2Bootstrap] Analytics track change error:', err.message);
        }
      });

      // When quality changes, log to analytics
      window.addEventListener('qualitymanager:change', (e) => {
        try {
          if (this.modules.analytics && typeof this.modules.analytics.trackEvent === 'function') {
            this.modules.analytics.trackEvent('quality_change', e.detail);
          }
        } catch (err) {
          console.warn('[Phase2Bootstrap] Analytics quality change error:', err.message);
        }
      });

      // When buffering happens, log to analytics
      window.addEventListener('player:buffering', (e) => {
        try {
          if (this.modules.analytics && typeof this.modules.analytics.trackEvent === 'function') {
            this.modules.analytics.trackEvent('buffering', e.detail);
          }
        } catch (err) {
          console.warn('[Phase2Bootstrap] Analytics buffering error:', err.message);
        }
      });

      // Connect performance manager to playlist for virtual scrolling
      window.addEventListener('playlist:updated', (e) => {
        try {
          if (this.modules.performanceManager && typeof this.modules.performanceManager.optimizeList === 'function') {
            this.modules.performanceManager.optimizeList(e.detail);
          }
        } catch (err) {
          console.warn('[Phase2Bootstrap] Performance playlist update error:', err.message);
        }
      });

      // Re-detect media element when source changes
      window.addEventListener('player:sourcechange', () => {
        this.mediaElement = this._findMediaElement();
      });
    }

    /**
     * Register the service worker for offline/caching support.
     */
    _registerServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./phase2/service-worker.js')
          .then((registration) => {
            console.log('[Phase2Bootstrap] Service Worker registered, scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('[Phase2Bootstrap] Service Worker registration failed:', err.message);
          });
      }
    }

    /**
     * Get a reference to an initialized module.
     */
    getModule(name) {
      return this.modules[name] || null;
    }
  }

  // Wait for DOM ready then initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.Phase2Bootstrap = new Phase2Bootstrap();
      window.Phase2Bootstrap.init();
    });
  } else {
    window.Phase2Bootstrap = new Phase2Bootstrap();
    window.Phase2Bootstrap.init();
  }
})();
