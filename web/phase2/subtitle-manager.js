/**
 * Advanced Subtitle Manager Module
 * Subtitle styling, sync offset, multiple tracks, position control
 */

class SubtitleManager {
  constructor(options = {}) {
    this.videoElement = options.videoElement || null;
    this.container = null;
    this.tracks = [];
    this.activeTrackIds = [];
    this.storageKey = options.storageKey || 'squicky-subtitle-settings';

    // Default style settings
    this.styles = {
      fontSize: 100,         // 50-200%
      fontFamily: 'sans-serif',
      color: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      textShadow: 'outline', // none, outline, dropshadow, raised, depressed
      position: 'bottom',    // top, bottom, custom
      verticalOffset: 90,    // 0-100% (from top)
      bold: false,
      italic: false
    };

    // Sync offset in seconds (-10 to +10)
    this.syncOffset = 0;

    this.loadSettings();
    this.init();
  }

  init() {
    window.addEventListener('subtitle:requestPanel', () => this.togglePanel());
  }

  /**
   * Create subtitle settings panel
   */
  createPanel(parentElement) {
    if (this.container) return this.container;

    this.container = document.createElement('div');
    this.container.className = 'subtitle-panel';
    this.container.innerHTML = this.buildPanelHTML();

    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    this.bindEvents();
    this.applyStyles();
    return this.container;
  }

  buildPanelHTML() {
    const fontFamilies = [
      { value: 'sans-serif', label: 'Sans-Serif' },
      { value: 'serif', label: 'Serif' },
      { value: 'monospace', label: 'Monospace' },
      { value: '"Courier New", monospace', label: 'Courier' },
      { value: '"Arial", sans-serif', label: 'Arial' },
      { value: '"Georgia", serif', label: 'Georgia' }
    ];

    const shadowOptions = [
      { value: 'none', label: 'None' },
      { value: 'outline', label: 'Outline' },
      { value: 'dropshadow', label: 'Drop Shadow' },
      { value: 'raised', label: 'Raised' },
      { value: 'depressed', label: 'Depressed' }
    ];

    return `
      <div class="subtitle-panel-header">
        <h3 class="subtitle-panel-title">Subtitle Settings</h3>
        <button class="subtitle-panel-close" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="subtitle-panel-body">
        <!-- Track List -->
        <div class="subtitle-section">
          <h4 class="subtitle-section-title">Tracks</h4>
          <div class="subtitle-track-list"></div>
          <button class="subtitle-add-track-btn">+ Add Subtitle File</button>
          <input type="file" class="subtitle-file-input" accept=".vtt,.srt,.ass,.ssa" style="display:none">
        </div>

        <!-- Sync Offset -->
        <div class="subtitle-section">
          <h4 class="subtitle-section-title">Sync Offset</h4>
          <div class="subtitle-sync-controls">
            <button class="subtitle-sync-btn" data-delta="-1">-1s</button>
            <button class="subtitle-sync-btn" data-delta="-0.1">-0.1s</button>
            <span class="subtitle-sync-value">${this.syncOffset.toFixed(1)}s</span>
            <button class="subtitle-sync-btn" data-delta="0.1">+0.1s</button>
            <button class="subtitle-sync-btn" data-delta="1">+1s</button>
          </div>
          <input type="range" class="subtitle-sync-slider" min="-10" max="10" step="0.1" value="${this.syncOffset}">
          <button class="subtitle-sync-reset">Reset</button>
        </div>

        <!-- Font Size -->
        <div class="subtitle-section">
          <h4 class="subtitle-section-title">Font Size: <span class="subtitle-fontsize-value">${this.styles.fontSize}%</span></h4>
          <input type="range" class="subtitle-fontsize-slider" min="50" max="200" step="10" value="${this.styles.fontSize}">
        </div>

        <!-- Font Family -->
        <div class="subtitle-section">
          <h4 class="subtitle-section-title">Font</h4>
          <select class="subtitle-font-select">
            ${fontFamilies.map(f => `<option value="${f.value}" ${this.styles.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
          </select>
        </div>

        <!-- Colors -->
        <div class="subtitle-section">
          <h4 class="subtitle-section-title">Colors</h4>
          <div class="subtitle-color-row">
            <label>Text Color</label>
            <input type="color" class="subtitle-text-color" value="${this.styles.color}">
          </div>
          <div class="subtitle-color-row">
            <label>Background</label>
            <div class="subtitle-bg-controls">
              <input type="color" class="subtitle-bg-color" value="${this.styles.backgroundColor}">
              <input type="range" class="subtitle-bg-opacity" min="0" max="100" step="5" value="${Math.round(this.styles.backgroundOpacity * 100)}">
              <span class="subtitle-bg-opacity-value">${Math.round(this.styles.backgroundOpacity * 100)}%</span>
            </div>
          </div>
        </div>

        <!-- Text Shadow -->
        <div class="subtitle-section">
          <h4 class="subtitle-section-title">Text Shadow</h4>
          <div class="subtitle-shadow-options">
            ${shadowOptions.map(s => `<button class="subtitle-shadow-btn ${this.styles.textShadow === s.value ? 'active' : ''}" data-shadow="${s.value}">${s.label}</button>`).join('')}
          </div>
        </div>

        <!-- Position -->
        <div class="subtitle-section">
          <h4 class="subtitle-section-title">Position</h4>
          <div class="subtitle-position-controls">
            <button class="subtitle-pos-btn ${this.styles.position === 'top' ? 'active' : ''}" data-pos="top">Top</button>
            <button class="subtitle-pos-btn ${this.styles.position === 'bottom' ? 'active' : ''}" data-pos="bottom">Bottom</button>
            <button class="subtitle-pos-btn ${this.styles.position === 'custom' ? 'active' : ''}" data-pos="custom">Custom</button>
          </div>
          <div class="subtitle-offset-control ${this.styles.position === 'custom' ? '' : 'hidden'}">
            <label>Vertical Offset</label>
            <input type="range" class="subtitle-offset-slider" min="0" max="100" value="${this.styles.verticalOffset}">
            <span class="subtitle-offset-value">${this.styles.verticalOffset}%</span>
          </div>
        </div>

        <!-- Search -->
        <div class="subtitle-section">
          <h4 class="subtitle-section-title">Search Subtitles</h4>
          <input type="text" class="subtitle-search-input" placeholder="Search in subtitles...">
          <div class="subtitle-search-results"></div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    if (!this.container) return;

    // Close button
    this.container.querySelector('.subtitle-panel-close').addEventListener('click', () => this.togglePanel());

    // Sync controls
    this.container.querySelectorAll('.subtitle-sync-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseFloat(btn.dataset.delta);
        this.setSyncOffset(this.syncOffset + delta);
      });
    });

    const syncSlider = this.container.querySelector('.subtitle-sync-slider');
    syncSlider.addEventListener('input', (e) => this.setSyncOffset(parseFloat(e.target.value)));

    this.container.querySelector('.subtitle-sync-reset').addEventListener('click', () => this.setSyncOffset(0));

    // Font size
    const fontSizeSlider = this.container.querySelector('.subtitle-fontsize-slider');
    fontSizeSlider.addEventListener('input', (e) => {
      this.styles.fontSize = parseInt(e.target.value);
      this.container.querySelector('.subtitle-fontsize-value').textContent = `${this.styles.fontSize}%`;
      this.applyStyles();
      this.saveSettings();
      this.emitEvent('subtitle:stylechange', { property: 'fontSize', value: this.styles.fontSize });
    });

    // Font family
    const fontSelect = this.container.querySelector('.subtitle-font-select');
    fontSelect.addEventListener('change', (e) => {
      this.styles.fontFamily = e.target.value;
      this.applyStyles();
      this.saveSettings();
      this.emitEvent('subtitle:stylechange', { property: 'fontFamily', value: this.styles.fontFamily });
    });

    // Text color
    const textColor = this.container.querySelector('.subtitle-text-color');
    textColor.addEventListener('input', (e) => {
      this.styles.color = e.target.value;
      this.applyStyles();
      this.saveSettings();
      this.emitEvent('subtitle:stylechange', { property: 'color', value: this.styles.color });
    });

    // Background color & opacity
    const bgColor = this.container.querySelector('.subtitle-bg-color');
    bgColor.addEventListener('input', (e) => {
      this.styles.backgroundColor = e.target.value;
      this.applyStyles();
      this.saveSettings();
    });

    const bgOpacity = this.container.querySelector('.subtitle-bg-opacity');
    bgOpacity.addEventListener('input', (e) => {
      this.styles.backgroundOpacity = parseInt(e.target.value) / 100;
      this.container.querySelector('.subtitle-bg-opacity-value').textContent = `${e.target.value}%`;
      this.applyStyles();
      this.saveSettings();
    });

    // Text shadow
    this.container.querySelectorAll('.subtitle-shadow-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.subtitle-shadow-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.styles.textShadow = btn.dataset.shadow;
        this.applyStyles();
        this.saveSettings();
        this.emitEvent('subtitle:stylechange', { property: 'textShadow', value: this.styles.textShadow });
      });
    });

    // Position
    this.container.querySelectorAll('.subtitle-pos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.subtitle-pos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.styles.position = btn.dataset.pos;
        const offsetControl = this.container.querySelector('.subtitle-offset-control');
        offsetControl.classList.toggle('hidden', this.styles.position !== 'custom');
        this.applyStyles();
        this.saveSettings();
        this.emitEvent('subtitle:stylechange', { property: 'position', value: this.styles.position });
      });
    });

    // Custom offset
    const offsetSlider = this.container.querySelector('.subtitle-offset-slider');
    offsetSlider.addEventListener('input', (e) => {
      this.styles.verticalOffset = parseInt(e.target.value);
      this.container.querySelector('.subtitle-offset-value').textContent = `${this.styles.verticalOffset}%`;
      this.applyStyles();
      this.saveSettings();
    });

    // Add track file
    const addBtn = this.container.querySelector('.subtitle-add-track-btn');
    const fileInput = this.container.querySelector('.subtitle-file-input');
    addBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileLoad(e));

    // Search
    const searchInput = this.container.querySelector('.subtitle-search-input');
    searchInput.addEventListener('input', (e) => this.searchSubtitles(e.target.value));
  }

  /**
   * Set sync offset with clamping
   */
  setSyncOffset(offset) {
    this.syncOffset = Math.max(-10, Math.min(10, parseFloat(offset.toFixed(1))));

    if (this.container) {
      this.container.querySelector('.subtitle-sync-value').textContent = `${this.syncOffset.toFixed(1)}s`;
      this.container.querySelector('.subtitle-sync-slider').value = this.syncOffset;
    }

    this.applySyncOffset();
    this.saveSettings();
    this.emitEvent('subtitle:syncchange', { offset: this.syncOffset });
  }

  /**
   * Apply sync offset to text tracks
   */
  applySyncOffset() {
    if (!this.videoElement) return;

    for (const track of this.tracks) {
      if (track.textTrack && track.textTrack.cues) {
        const cues = Array.from(track.textTrack.cues);
        const delta = this.syncOffset - (track.appliedOffset || 0);

        for (const cue of cues) {
          cue.startTime = Math.max(0, cue.startTime + delta);
          cue.endTime = Math.max(cue.startTime + 0.1, cue.endTime + delta);
        }

        track.appliedOffset = this.syncOffset;
      }
    }
  }

  /**
   * Add a subtitle track
   */
  addTrack(trackData) {
    const track = {
      id: this.generateId(),
      label: trackData.label || trackData.name || 'Unknown',
      language: trackData.language || 'und',
      src: trackData.src || null,
      content: trackData.content || null,
      enabled: trackData.enabled !== false,
      textTrack: null,
      appliedOffset: 0
    };

    this.tracks.push(track);

    if (track.enabled) {
      this.activeTrackIds.push(track.id);
    }

    this.activateTrack(track);
    this.renderTrackList();
    this.emitEvent('subtitle:trackchange', { action: 'add', track });

    return track;
  }

  /**
   * Activate a track on the video element
   */
  activateTrack(track) {
    if (!this.videoElement) return;

    if (track.src) {
      const trackEl = document.createElement('track');
      trackEl.kind = 'subtitles';
      trackEl.label = track.label;
      trackEl.srclang = track.language;
      trackEl.src = track.src;
      if (track.enabled) trackEl.default = true;
      this.videoElement.appendChild(trackEl);
      track.trackElement = trackEl;

      trackEl.addEventListener('load', () => {
        track.textTrack = trackEl.track;
        track.textTrack.mode = track.enabled ? 'showing' : 'hidden';
        if (this.syncOffset !== 0) this.applySyncOffset();
      });
    } else if (track.content) {
      // Create blob URL from content
      const blob = new Blob([track.content], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      const trackEl = document.createElement('track');
      trackEl.kind = 'subtitles';
      trackEl.label = track.label;
      trackEl.srclang = track.language;
      trackEl.src = url;
      if (track.enabled) trackEl.default = true;
      this.videoElement.appendChild(trackEl);
      track.trackElement = trackEl;

      trackEl.addEventListener('load', () => {
        track.textTrack = trackEl.track;
        track.textTrack.mode = track.enabled ? 'showing' : 'hidden';
        if (this.syncOffset !== 0) this.applySyncOffset();
      });
    }
  }

  /**
   * Toggle track on/off
   */
  toggleTrack(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;

    track.enabled = !track.enabled;

    if (track.textTrack) {
      track.textTrack.mode = track.enabled ? 'showing' : 'hidden';
    }

    if (track.enabled) {
      if (!this.activeTrackIds.includes(trackId)) {
        this.activeTrackIds.push(trackId);
      }
    } else {
      this.activeTrackIds = this.activeTrackIds.filter(id => id !== trackId);
    }

    this.renderTrackList();
    this.emitEvent('subtitle:trackchange', { action: 'toggle', track });
  }

  /**
   * Remove a track
   */
  removeTrack(trackId) {
    const idx = this.tracks.findIndex(t => t.id === trackId);
    if (idx === -1) return;

    const track = this.tracks[idx];
    if (track.trackElement) {
      track.trackElement.remove();
    }

    this.tracks.splice(idx, 1);
    this.activeTrackIds = this.activeTrackIds.filter(id => id !== trackId);
    this.renderTrackList();
    this.emitEvent('subtitle:trackchange', { action: 'remove', trackId });
  }

  /**
   * Handle subtitle file load
   */
  async handleFileLoad(e) {
    const files = Array.from(e.target.files);

    for (const file of files) {
      let content = await file.text();
      const name = file.name.replace(/\.[^/.]+$/, '');

      // Convert SRT to VTT if needed
      if (file.name.endsWith('.srt')) {
        content = this.srtToVtt(content);
      }

      this.addTrack({
        label: name,
        content: content,
        enabled: true
      });
    }

    e.target.value = '';
  }

  /**
   * Convert SRT to WebVTT format
   */
  srtToVtt(srt) {
    let vtt = 'WEBVTT\n\n';
    // Replace SRT time format (00:00:00,000) with VTT format (00:00:00.000)
    vtt += srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    return vtt;
  }

  /**
   * Auto-load detection based on filename patterns
   */
  detectMatchingSubtitles(mediaFilename) {
    const baseName = mediaFilename.replace(/\.[^/.]+$/, '');
    const patterns = [
      `${baseName}.vtt`,
      `${baseName}.srt`,
      `${baseName}.en.vtt`,
      `${baseName}.en.srt`,
      `${baseName}_en.vtt`,
      `${baseName}_en.srt`
    ];
    return patterns;
  }

  /**
   * Search subtitles
   */
  searchSubtitles(query) {
    const resultsContainer = this.container ? this.container.querySelector('.subtitle-search-results') : null;
    if (!resultsContainer) return;

    if (!query || query.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }

    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const track of this.tracks) {
      if (!track.textTrack || !track.textTrack.cues) continue;

      const cues = Array.from(track.textTrack.cues);
      for (const cue of cues) {
        if (cue.text.toLowerCase().includes(lowerQuery)) {
          results.push({
            track: track.label,
            text: cue.text,
            startTime: cue.startTime,
            endTime: cue.endTime
          });
        }
        if (results.length >= 20) break;
      }
      if (results.length >= 20) break;
    }

    resultsContainer.innerHTML = results.length > 0
      ? results.map(r => `
          <div class="subtitle-search-result" data-time="${r.startTime}">
            <span class="subtitle-search-time">${this.formatTime(r.startTime)}</span>
            <span class="subtitle-search-text">${this.escapeHTML(r.text)}</span>
          </div>
        `).join('')
      : '<div class="subtitle-search-empty">No results found</div>';

    // Click to seek
    resultsContainer.querySelectorAll('.subtitle-search-result').forEach(el => {
      el.addEventListener('click', () => {
        if (this.videoElement) {
          this.videoElement.currentTime = parseFloat(el.dataset.time);
        }
      });
    });
  }

  /**
   * Render track list in panel
   */
  renderTrackList() {
    if (!this.container) return;
    const listEl = this.container.querySelector('.subtitle-track-list');
    if (!listEl) return;

    if (this.tracks.length === 0) {
      listEl.innerHTML = '<div class="subtitle-no-tracks">No subtitle tracks loaded</div>';
      return;
    }

    listEl.innerHTML = this.tracks.map(track => `
      <div class="subtitle-track-item" data-id="${track.id}">
        <label class="subtitle-track-toggle">
          <input type="checkbox" ${track.enabled ? 'checked' : ''} data-track-id="${track.id}">
          <span class="subtitle-track-switch"></span>
        </label>
        <span class="subtitle-track-label">${this.escapeHTML(track.label)}</span>
        <span class="subtitle-track-lang">${track.language}</span>
        <button class="subtitle-track-remove" data-track-id="${track.id}" title="Remove">x</button>
      </div>
    `).join('');

    // Bind toggle events
    listEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => this.toggleTrack(input.dataset.trackId));
    });

    // Bind remove events
    listEl.querySelectorAll('.subtitle-track-remove').forEach(btn => {
      btn.addEventListener('click', () => this.removeTrack(btn.dataset.trackId));
    });
  }

  /**
   * Apply styles to subtitle display
   */
  applyStyles() {
    // Apply via ::cue CSS injection
    let styleEl = document.getElementById('squicky-subtitle-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'squicky-subtitle-styles';
      document.head.appendChild(styleEl);
    }

    const shadow = this.getTextShadowCSS();
    const bgColor = this.hexToRgba(this.styles.backgroundColor, this.styles.backgroundOpacity);

    styleEl.textContent = `
      video::cue {
        font-size: ${this.styles.fontSize}%;
        font-family: ${this.styles.fontFamily};
        color: ${this.styles.color};
        background-color: ${bgColor};
        text-shadow: ${shadow};
        ${this.styles.bold ? 'font-weight: bold;' : ''}
        ${this.styles.italic ? 'font-style: italic;' : ''}
      }
    `;

    // Apply position
    if (this.videoElement) {
      const container = this.videoElement.parentElement;
      if (container) {
        container.style.setProperty('--subtitle-position', this.getPositionValue());
      }
    }
  }

  getTextShadowCSS() {
    switch (this.styles.textShadow) {
      case 'outline':
        return '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000';
      case 'dropshadow':
        return '2px 2px 4px rgba(0,0,0,0.8)';
      case 'raised':
        return '1px 1px 0 rgba(0,0,0,0.5), 2px 2px 0 rgba(0,0,0,0.3)';
      case 'depressed':
        return '-1px -1px 0 rgba(0,0,0,0.5), -2px -2px 0 rgba(0,0,0,0.3)';
      default:
        return 'none';
    }
  }

  getPositionValue() {
    switch (this.styles.position) {
      case 'top': return '10%';
      case 'bottom': return '90%';
      case 'custom': return `${this.styles.verticalOffset}%`;
      default: return '90%';
    }
  }

  hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    if (this.container) {
      this.container.classList.toggle('visible');
    }
  }

  /**
   * Persistence
   */
  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        styles: this.styles,
        syncOffset: this.syncOffset
      }));
    } catch (e) {
      console.warn('Failed to save subtitle settings:', e);
    }
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.styles) Object.assign(this.styles, data.styles);
        if (data.syncOffset !== undefined) this.syncOffset = data.syncOffset;
      }
    } catch (e) {
      console.warn('Failed to load subtitle settings:', e);
    }
  }

  /**
   * Utility
   */
  emitEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  generateId() {
    return 'sub-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  getState() {
    return {
      tracks: this.tracks.map(t => ({ id: t.id, label: t.label, enabled: t.enabled })),
      styles: { ...this.styles },
      syncOffset: this.syncOffset
    };
  }
}

// Export for use in other modules
window.SubtitleManager = SubtitleManager;
