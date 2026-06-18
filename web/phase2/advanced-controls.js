/**
 * Advanced Controls Module
 * A-B repeat, screenshot, slow-motion, frame-by-frame, audio boost, equalizer
 */

class AdvancedControls {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.options = {
      fps: options.fps || 30,
      maxBoost: options.maxBoost || 4.0,
      storageKey: options.storageKey || 'squicky-eq-settings',
      ...options
    };

    // A-B Loop state
    this.loop = { a: null, b: null, active: false };

    // Speed state
    this.currentSpeed = 1.0;
    this.speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    // Audio state
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.eqNodes = [];
    this.audioConnected = false;
    this.boostLevel = 1.0;

    // EQ bands
    this.eqBands = [
      { frequency: 60, type: 'lowshelf', gain: 0, label: '60 Hz' },
      { frequency: 230, type: 'peaking', gain: 0, label: '230 Hz' },
      { frequency: 910, type: 'peaking', gain: 0, label: '910 Hz' },
      { frequency: 4000, type: 'peaking', gain: 0, label: '4 kHz' },
      { frequency: 14000, type: 'highshelf', gain: 0, label: '14 kHz' }
    ];

    // EQ Presets
    this.eqPresets = {
      flat: { name: 'Flat', gains: [0, 0, 0, 0, 0] },
      bassBoost: { name: 'Bass Boost', gains: [8, 5, 0, -2, -1] },
      trebleBoost: { name: 'Treble Boost', gains: [-2, -1, 0, 4, 8] },
      vocal: { name: 'Vocal', gains: [-3, 0, 6, 4, -2] },
      rock: { name: 'Rock', gains: [5, 3, -1, 4, 6] },
      jazz: { name: 'Jazz', gains: [4, 2, -2, 2, 5] }
    };

    // Bind the timeupdate handler
    this._onTimeUpdate = this._onTimeUpdate.bind(this);
    this.video.addEventListener('timeupdate', this._onTimeUpdate);

    // Load saved settings
    this._loadSettings();
  }

  // ─── A-B Repeat Loop ────────────────────────────────────────────────

  setPointA(time) {
    if (time === undefined) time = this.video.currentTime;
    this.loop.a = time;
    if (this.loop.b !== null && this.loop.a < this.loop.b) {
      this.loop.active = true;
    }
    this._emit('controls:abloop', { a: this.loop.a, b: this.loop.b, active: this.loop.active });
  }

  setPointB(time) {
    if (time === undefined) time = this.video.currentTime;
    this.loop.b = time;
    if (this.loop.a !== null && this.loop.a < this.loop.b) {
      this.loop.active = true;
    }
    this._emit('controls:abloop', { a: this.loop.a, b: this.loop.b, active: this.loop.active });
  }

  clearLoop() {
    this.loop = { a: null, b: null, active: false };
    this._emit('controls:abloop', { a: null, b: null, active: false });
  }

  getLoopMarkers() {
    return { ...this.loop };
  }

  _onTimeUpdate() {
    if (this.loop.active && this.loop.a !== null && this.loop.b !== null) {
      if (this.video.currentTime >= this.loop.b) {
        this.video.currentTime = this.loop.a;
      }
    }
  }

  // ─── Screenshot Capture ─────────────────────────────────────────────

  captureFrame(options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth || this.video.clientWidth;
    canvas.height = this.video.videoHeight || this.video.clientHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `squicky-screenshot-${timestamp}.png`;

    // Generate blob
    canvas.toBlob((blob) => {
      if (!blob) return;

      // Download
      if (options.download !== false) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      // Copy to clipboard if requested and available
      if (options.clipboard && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).catch(() => {});
      }

      this._emit('controls:screenshot', { filename, width: canvas.width, height: canvas.height });
    }, 'image/png');

    return filename;
  }

  // ─── Slow-motion / Speed Control ───────────────────────────────────

  setSpeed(rate) {
    if (rate < 0.25) rate = 0.25;
    if (rate > 2.0) rate = 2.0;
    this.currentSpeed = rate;
    this.video.playbackRate = rate;
    this._emit('controls:speedchange', { speed: rate });
  }

  getSpeed() {
    return this.currentSpeed;
  }

  getAvailableSpeeds() {
    return [...this.speeds];
  }

  // ─── Frame-by-frame Navigation ─────────────────────────────────────

  nextFrame() {
    this.video.pause();
    this.video.currentTime += 1 / this.options.fps;
  }

  prevFrame() {
    this.video.pause();
    this.video.currentTime -= 1 / this.options.fps;
  }

  // ─── Audio Boost (Web Audio API) ───────────────────────────────────

  _initAudioContext() {
    if (this.audioConnected) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.sourceNode = this.audioContext.createMediaElementSource(this.video);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.boostLevel;

      // Create EQ filter nodes
      this.eqNodes = this.eqBands.map((band) => {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.frequency;
        filter.gain.value = band.gain;
        if (band.type === 'peaking') {
          filter.Q.value = 1.0;
        }
        return filter;
      });

      // Connect: source -> eq1 -> eq2 -> eq3 -> eq4 -> eq5 -> gain -> destination
      this.sourceNode.connect(this.eqNodes[0]);
      for (let i = 0; i < this.eqNodes.length - 1; i++) {
        this.eqNodes[i].connect(this.eqNodes[i + 1]);
      }
      this.eqNodes[this.eqNodes.length - 1].connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.audioConnected = true;
    } catch (err) {
      console.warn('AdvancedControls: Web Audio API not available', err);
    }
  }

  /**
   * Set audio boost level (1.0 = 100%, 4.0 = 400%)
   */
  setBoost(level) {
    if (!this.audioConnected) this._initAudioContext();
    if (!this.audioConnected) return;

    level = Math.max(1.0, Math.min(this.options.maxBoost, level));
    this.boostLevel = level;
    this.gainNode.gain.value = level;
    this._saveSettings();
    this._emit('controls:filterchange', { type: 'boost', level });
  }

  getBoost() {
    return this.boostLevel;
  }

  // ─── 5-Band Equalizer ──────────────────────────────────────────────

  /**
   * Set gain for a specific EQ band
   * @param {number} bandIndex - 0-4 index
   * @param {number} gain - -12 to +12 dB
   */
  setEQBand(bandIndex, gain) {
    if (!this.audioConnected) this._initAudioContext();
    if (!this.audioConnected) return;

    if (bandIndex < 0 || bandIndex >= this.eqBands.length) return;
    gain = Math.max(-12, Math.min(12, gain));

    this.eqBands[bandIndex].gain = gain;
    this.eqNodes[bandIndex].gain.value = gain;
    this._saveSettings();
    this._emit('controls:eqchange', { bandIndex, gain, bands: this.getEQBands() });
  }

  /**
   * Get all EQ band settings
   */
  getEQBands() {
    return this.eqBands.map(b => ({ ...b }));
  }

  /**
   * Apply an EQ preset
   */
  applyEQPreset(presetKey) {
    if (!this.audioConnected) this._initAudioContext();
    const preset = this.eqPresets[presetKey];
    if (!preset) return;

    preset.gains.forEach((gain, i) => {
      this.eqBands[i].gain = gain;
      if (this.eqNodes[i]) {
        this.eqNodes[i].gain.value = gain;
      }
    });

    this._saveSettings();
    this._emit('controls:eqchange', { preset: presetKey, bands: this.getEQBands() });
  }

  /**
   * Get available EQ presets
   */
  getEQPresets() {
    return { ...this.eqPresets };
  }

  // ─── Persistence ───────────────────────────────────────────────────

  _saveSettings() {
    try {
      const settings = {
        boost: this.boostLevel,
        eq: this.eqBands.map(b => b.gain)
      };
      localStorage.setItem(this.options.storageKey, JSON.stringify(settings));
    } catch (err) {
      // localStorage not available
    }
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(this.options.storageKey);
      if (!raw) return;
      const settings = JSON.parse(raw);

      if (settings.boost) {
        this.boostLevel = settings.boost;
      }
      if (settings.eq && Array.isArray(settings.eq)) {
        settings.eq.forEach((gain, i) => {
          if (i < this.eqBands.length) {
            this.eqBands[i].gain = gain;
          }
        });
      }
    } catch (err) {
      // Invalid settings
    }
  }

  // ─── Event Emission ────────────────────────────────────────────────

  _emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  // ─── Cleanup ───────────────────────────────────────────────────────

  destroy() {
    this.video.removeEventListener('timeupdate', this._onTimeUpdate);
    this.clearLoop();

    if (this.audioContext) {
      this.sourceNode.disconnect();
      this.eqNodes.forEach(n => n.disconnect());
      this.gainNode.disconnect();
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioConnected = false;
  }
}

// Attach to window
window.AdvancedControls = AdvancedControls;
