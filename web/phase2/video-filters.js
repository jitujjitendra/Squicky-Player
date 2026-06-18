/**
 * Video Filters Module
 * CSS-based video filters with presets and persistence
 */

class VideoFilters {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.options = {
      storageKey: options.storageKey || 'squicky-video-filters',
      presetsStorageKey: options.presetsStorageKey || 'squicky-filter-presets',
      ...options
    };

    // Filter defaults
    this.defaults = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hueRotate: 0,
      blur: 0,
      sepia: 0,
      grayscale: 0,
      invert: false
    };

    // Current filter values
    this.filters = { ...this.defaults };

    // Built-in presets
    this.builtInPresets = {
      normal: {
        name: 'Normal',
        description: 'Reset all filters to default',
        values: { ...this.defaults }
      },
      cinema: {
        name: 'Cinema',
        description: 'Warm tones with slight contrast boost',
        values: {
          brightness: 95,
          contrast: 115,
          saturation: 110,
          hueRotate: 5,
          blur: 0,
          sepia: 10,
          grayscale: 0,
          invert: false
        }
      },
      warm: {
        name: 'Warm',
        description: 'Increased saturation with slight sepia',
        values: {
          brightness: 105,
          contrast: 100,
          saturation: 130,
          hueRotate: 10,
          blur: 0,
          sepia: 15,
          grayscale: 0,
          invert: false
        }
      },
      cool: {
        name: 'Cool',
        description: 'Decreased saturation with slight hue shift',
        values: {
          brightness: 100,
          contrast: 105,
          saturation: 80,
          hueRotate: 200,
          blur: 0,
          sepia: 0,
          grayscale: 0,
          invert: false
        }
      },
      vintage: {
        name: 'Vintage',
        description: 'Sepia with reduced brightness',
        values: {
          brightness: 85,
          contrast: 110,
          saturation: 70,
          hueRotate: 0,
          blur: 0,
          sepia: 50,
          grayscale: 10,
          invert: false
        }
      },
      bw: {
        name: 'B&W',
        description: 'Full grayscale',
        values: {
          brightness: 100,
          contrast: 110,
          saturation: 0,
          hueRotate: 0,
          blur: 0,
          sepia: 0,
          grayscale: 100,
          invert: false
        }
      }
    };

    // Load custom presets from storage
    this.customPresets = this._loadCustomPresets();
  }

  // ─── Filter Setters ─────────────────────────────────────────────────

  /**
   * Set brightness (0-200%)
   */
  setBrightness(value) {
    this.filters.brightness = this._clamp(value, 0, 200);
    this._apply();
  }

  /**
   * Set contrast (0-200%)
   */
  setContrast(value) {
    this.filters.contrast = this._clamp(value, 0, 200);
    this._apply();
  }

  /**
   * Set saturation (0-200%)
   */
  setSaturation(value) {
    this.filters.saturation = this._clamp(value, 0, 200);
    this._apply();
  }

  /**
   * Set hue rotation (0-360 degrees)
   */
  setHueRotate(value) {
    this.filters.hueRotate = this._clamp(value, 0, 360);
    this._apply();
  }

  /**
   * Set blur (0-10px)
   */
  setBlur(value) {
    this.filters.blur = this._clamp(value, 0, 10);
    this._apply();
  }

  /**
   * Set sepia (0-100%)
   */
  setSepia(value) {
    this.filters.sepia = this._clamp(value, 0, 100);
    this._apply();
  }

  /**
   * Set grayscale (0-100%)
   */
  setGrayscale(value) {
    this.filters.grayscale = this._clamp(value, 0, 100);
    this._apply();
  }

  /**
   * Toggle invert (on/off)
   */
  setInvert(enabled) {
    this.filters.invert = !!enabled;
    this._apply();
  }

  /**
   * Set multiple filter values at once
   */
  setFilters(values) {
    if (values.brightness !== undefined) this.filters.brightness = this._clamp(values.brightness, 0, 200);
    if (values.contrast !== undefined) this.filters.contrast = this._clamp(values.contrast, 0, 200);
    if (values.saturation !== undefined) this.filters.saturation = this._clamp(values.saturation, 0, 200);
    if (values.hueRotate !== undefined) this.filters.hueRotate = this._clamp(values.hueRotate, 0, 360);
    if (values.blur !== undefined) this.filters.blur = this._clamp(values.blur, 0, 10);
    if (values.sepia !== undefined) this.filters.sepia = this._clamp(values.sepia, 0, 100);
    if (values.grayscale !== undefined) this.filters.grayscale = this._clamp(values.grayscale, 0, 100);
    if (values.invert !== undefined) this.filters.invert = !!values.invert;
    this._apply();
  }

  // ─── Filter Getters ─────────────────────────────────────────────────

  getFilters() {
    return { ...this.filters };
  }

  getDefaults() {
    return { ...this.defaults };
  }

  // ─── Apply Filters ──────────────────────────────────────────────────

  /**
   * Build and apply the CSS filter string to the video element
   */
  _apply() {
    const filterString = this._buildFilterString();
    this.video.style.filter = filterString;

    this._emit('filters:change', {
      filters: this.getFilters(),
      filterString
    });
  }

  _buildFilterString() {
    const parts = [];

    if (this.filters.brightness !== 100) {
      parts.push(`brightness(${this.filters.brightness}%)`);
    }
    if (this.filters.contrast !== 100) {
      parts.push(`contrast(${this.filters.contrast}%)`);
    }
    if (this.filters.saturation !== 100) {
      parts.push(`saturate(${this.filters.saturation}%)`);
    }
    if (this.filters.hueRotate !== 0) {
      parts.push(`hue-rotate(${this.filters.hueRotate}deg)`);
    }
    if (this.filters.blur > 0) {
      parts.push(`blur(${this.filters.blur}px)`);
    }
    if (this.filters.sepia > 0) {
      parts.push(`sepia(${this.filters.sepia}%)`);
    }
    if (this.filters.grayscale > 0) {
      parts.push(`grayscale(${this.filters.grayscale}%)`);
    }
    if (this.filters.invert) {
      parts.push('invert(1)');
    }

    return parts.length > 0 ? parts.join(' ') : 'none';
  }

  // ─── Presets ────────────────────────────────────────────────────────

  /**
   * Apply a built-in preset
   */
  applyPreset(presetKey) {
    const preset = this.builtInPresets[presetKey] || this.customPresets[presetKey];
    if (!preset) return false;

    this.filters = { ...preset.values };
    this._apply();

    this._emit('filters:preset', {
      preset: presetKey,
      name: preset.name,
      filters: this.getFilters()
    });

    return true;
  }

  /**
   * Get all available presets (built-in + custom)
   */
  getPresets() {
    return {
      builtIn: { ...this.builtInPresets },
      custom: { ...this.customPresets }
    };
  }

  /**
   * Save current filters as a custom preset
   */
  saveCustomPreset(key, name, description = '') {
    this.customPresets[key] = {
      name,
      description,
      values: { ...this.filters }
    };
    this._saveCustomPresets();

    this._emit('filters:preset', {
      action: 'save',
      preset: key,
      name,
      filters: this.getFilters()
    });
  }

  /**
   * Delete a custom preset
   */
  deleteCustomPreset(key) {
    if (this.customPresets[key]) {
      delete this.customPresets[key];
      this._saveCustomPresets();

      this._emit('filters:preset', {
        action: 'delete',
        preset: key
      });
      return true;
    }
    return false;
  }

  // ─── Reset ──────────────────────────────────────────────────────────

  /**
   * Reset all filters to defaults
   */
  reset() {
    this.filters = { ...this.defaults };
    this._apply();
    this._emit('filters:reset', { filters: this.getFilters() });
  }

  // ─── Persistence ───────────────────────────────────────────────────

  _loadCustomPresets() {
    try {
      const raw = localStorage.getItem(this.options.presetsStorageKey);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (err) {
      return {};
    }
  }

  _saveCustomPresets() {
    try {
      localStorage.setItem(this.options.presetsStorageKey, JSON.stringify(this.customPresets));
    } catch (err) {
      // localStorage not available
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────

  _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  _emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  // ─── Cleanup ───────────────────────────────────────────────────────

  destroy() {
    this.reset();
    this.video.style.filter = '';
  }
}

// Attach to window
window.VideoFilters = VideoFilters;
