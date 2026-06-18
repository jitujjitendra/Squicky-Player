/**
 * Quality Management System (144p - 2160p)
 * Handles manual quality selection and adaptive quality switching
 */

class QualityManager {
  constructor(player, media) {
    this.player = player;
    this.media = media;
    this.currentQuality = null;
    this.availableQualities = [];
    this.autoQuality = true;
    this.bandwidth = 0;
    this.bufferHealth = 100;
    
    this.qualities = [
      { id: '144p', height: 144, width: 256, label: '144p', badge: 'SD', bitrate: 250 },
      { id: '240p', height: 240, width: 426, label: '240p', badge: 'SD', bitrate: 500 },
      { id: '360p', height: 360, width: 640, label: '360p', badge: 'SD', bitrate: 800 },
      { id: '480p', height: 480, width: 854, label: '480p', badge: 'SD', bitrate: 1200 },
      { id: '720p', height: 720, width: 1280, label: '720p', badge: 'HD', bitrate: 2500 },
      { id: '1080p', height: 1080, width: 1920, label: '1080p', badge: 'Full HD', bitrate: 5000 },
      { id: '1440p', height: 1440, width: 2560, label: '1440p', badge: '2K', bitrate: 9000 },
      { id: '2160p', height: 2160, width: 3840, label: '2160p', badge: '4K', bitrate: 16000 }
    ];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startBandwidthMonitoring();
    this.loadPreferences();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Monitor playback for quality adjustments
    this.media.addEventListener('playing', () => this.onPlaybackStart());
    this.media.addEventListener('progress', () => this.updateBufferHealth());
    this.media.addEventListener('waiting', () => this.onBuffering());
    this.media.addEventListener('canplaythrough', () => this.onBufferingEnd());

    // Detect quality changes
    if (this.player) {
      this.player.on('qualitieschange', (qualities) => this.updateAvailableQualities(qualities));
      this.player.on('qualitychange', (quality) => this.onQualityChange(quality));
    }
  }

  /**
   * Update available qualities from player
   */
  updateAvailableQualities(qualities) {
    if (!qualities || qualities.length === 0) {
      // Detect from video metadata
      this.detectQualitiesFromMedia();
      return;
    }

    this.availableQualities = qualities.map(q => {
      const match = this.qualities.find(qual => 
        qual.height === q.height || qual.label === q.label
      );
      return match ? { ...match, ...q } : q;
    });

    this.emitQualitiesUpdate();
  }

  /**
   * Detect qualities from media element metadata
   */
  detectQualitiesFromMedia() {
    if (!this.media.videoWidth || !this.media.videoHeight) return;

    const currentHeight = this.media.videoHeight;
    const matchingQuality = this.qualities.find(q => 
      Math.abs(q.height - currentHeight) <= 10
    );

    if (matchingQuality) {
      this.availableQualities = [matchingQuality];
      this.currentQuality = matchingQuality;
      this.emitQualitiesUpdate();
    }
  }

  /**
   * Get quality badge info
   */
  getQualityBadge(quality) {
    const badges = {
      'SD': { color: '#888', label: 'SD' },
      'HD': { color: '#1e90ff', label: 'HD' },
      'Full HD': { color: '#00bcd4', label: 'Full HD' },
      '2K': { color: '#9c27b0', label: '2K' },
      '4K': { color: '#ff5722', label: '4K' }
    };
    return badges[quality.badge] || badges.SD;
  }

  /**
   * Set quality manually
   */
  setQuality(qualityId) {
    const quality = this.qualities.find(q => q.id === qualityId);
    if (!quality) return;

    this.autoQuality = false;
    this.currentQuality = quality;

    // If player has quality API, use it
    if (this.player && typeof this.player.setQuality === 'function') {
      this.player.setQuality(quality.height);
    }

    this.savePreference(qualityId);
    this.emitQualityChange(quality);
    this.showQualityToast(quality);
  }

  /**
   * Enable auto quality
   */
  enableAutoQuality() {
    this.autoQuality = true;
    this.savePreference('auto');
    this.adjustQualityBasedOnBandwidth();
    this.showQualityToast({ label: 'Auto', badge: 'AUTO' });
  }

  /**
   * Start bandwidth monitoring
   */
  startBandwidthMonitoring() {
    let lastTime = Date.now();
    let lastBytes = 0;

    const monitor = () => {
      if (!this.media.buffered.length) {
        requestAnimationFrame(monitor);
        return;
      }

      const now = Date.now();
      const bufferedEnd = this.media.buffered.end(this.media.buffered.length - 1);
      const currentTime = this.media.currentTime;
      const downloadedBytes = bufferedEnd * 1024 * 1024; // Rough estimate

      if (now - lastTime >= 1000) {
        const bytes = downloadedBytes - lastBytes;
        const seconds = (now - lastTime) / 1000;
        this.bandwidth = (bytes / seconds / 1024).toFixed(0); // KB/s

        lastBytes = downloadedBytes;
        lastTime = now;

        // Auto-adjust quality if enabled
        if (this.autoQuality) {
          this.adjustQualityBasedOnBandwidth();
        }
      }

      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  }

  /**
   * Adjust quality based on bandwidth
   */
  adjustQualityBasedOnBandwidth() {
    if (!this.autoQuality || !this.bandwidth) return;

    // Find best quality for current bandwidth
    const bitrate = this.bandwidth * 8; // Convert KB/s to Kbps
    let bestQuality = this.qualities[0]; // Start with lowest

    for (const quality of this.qualities) {
      if (quality.bitrate <= bitrate * 0.8) { // 80% safety margin
        bestQuality = quality;
      } else {
        break;
      }
    }

    if (this.currentQuality?.id !== bestQuality.id) {
      this.currentQuality = bestQuality;
      this.emitQualityChange(bestQuality);
    }
  }

  /**
   * Update buffer health
   */
  updateBufferHealth() {
    if (!this.media.buffered.length) {
      this.bufferHealth = 0;
      return;
    }

    const bufferedEnd = this.media.buffered.end(this.media.buffered.length - 1);
    const currentTime = this.media.currentTime;
    const bufferedSeconds = bufferedEnd - currentTime;

    // Health: 100% = 30+ seconds, 0% = 0 seconds
    this.bufferHealth = Math.min(100, (bufferedSeconds / 30) * 100);
    this.emitBufferHealthUpdate();
  }

  /**
   * Handle playback start
   */
  onPlaybackStart() {
    if (!this.currentQuality && this.media.videoHeight) {
      this.detectQualitiesFromMedia();
    }
  }

  /**
   * Handle buffering event
   */
  onBuffering() {
    // Reduce quality if buffering frequently
    if (this.autoQuality && this.bufferHealth < 20) {
      const currentIndex = this.qualities.findIndex(q => q.id === this.currentQuality?.id);
      if (currentIndex > 0) {
        this.currentQuality = this.qualities[currentIndex - 1];
        this.emitQualityChange(this.currentQuality);
        console.log('[QualityManager] Reduced quality due to buffering');
      }
    }
  }

  /**
   * Handle buffering end
   */
  onBufferingEnd() {
    this.updateBufferHealth();
  }

  /**
   * Handle quality change from player
   */
  onQualityChange(quality) {
    this.currentQuality = quality;
    this.emitQualityChange(quality);
  }

  /**
   * Save quality preference
   */
  savePreference(qualityId) {
    try {
      localStorage.setItem('squicky-quality-preference', qualityId);
    } catch (e) {
      console.warn('[QualityManager] Failed to save preference:', e);
    }
  }

  /**
   * Load quality preference
   */
  loadPreferences() {
    try {
      const saved = localStorage.getItem('squicky-quality-preference');
      if (saved === 'auto') {
        this.autoQuality = true;
      } else if (saved) {
        this.setQuality(saved);
      }
    } catch (e) {
      console.warn('[QualityManager] Failed to load preference:', e);
    }
  }

  /**
   * Show quality change toast
   */
  showQualityToast(quality) {
    // Remove existing toast
    const existing = document.querySelector('.quality-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'quality-toast';
    toast.innerHTML = `
      <div class="quality-toast-icon">${quality.badge}</div>
      <div class="quality-toast-label">${quality.label}</div>
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after 2 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Get current quality info
   */
  getCurrentQuality() {
    return {
      quality: this.currentQuality,
      auto: this.autoQuality,
      bandwidth: this.bandwidth,
      bufferHealth: this.bufferHealth,
      available: this.availableQualities
    };
  }

  /**
   * Get quality stats
   */
  getStats() {
    return {
      currentQuality: this.currentQuality?.label || 'Unknown',
      autoQuality: this.autoQuality,
      bandwidth: `${this.bandwidth} KB/s`,
      bufferHealth: `${this.bufferHealth.toFixed(0)}%`,
      availableQualities: this.availableQualities.length,
      resolution: this.currentQuality 
        ? `${this.currentQuality.width}×${this.currentQuality.height}`
        : 'Unknown'
    };
  }

  /**
   * Emit qualities update event
   */
  emitQualitiesUpdate() {
    const event = new CustomEvent('qualitymanager:qualities', {
      detail: {
        qualities: this.availableQualities,
        current: this.currentQuality
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Emit quality change event
   */
  emitQualityChange(quality) {
    const event = new CustomEvent('qualitymanager:change', {
      detail: {
        quality,
        auto: this.autoQuality
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Emit buffer health update
   */
  emitBufferHealthUpdate() {
    const event = new CustomEvent('qualitymanager:bufferhealth', {
      detail: {
        health: this.bufferHealth,
        bandwidth: this.bandwidth
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    // Remove event listeners if needed
    this.media = null;
    this.player = null;
  }
}

// Export
window.QualityManager = QualityManager;
