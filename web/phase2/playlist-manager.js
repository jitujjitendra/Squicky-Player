/**
 * Playlist Manager Module
 * Full playlist management with drag-drop reordering, auto-advance,
 * shuffle/repeat modes, M3U/JSON import/export, thumbnail generation.
 */

class PlaylistManager {
  constructor(options = {}) {
    this.items = [];
    this.currentIndex = -1;
    this.repeatMode = 'none'; // none, one, all
    this.shuffleEnabled = false;
    this.shuffleOrder = [];
    this.container = null;
    this.videoElement = options.videoElement || null;
    this.storageKey = options.storageKey || 'squicky-playlist';
    this.panelVisible = false;

    this.loadFromStorage();
    this.init();
  }

  init() {
    // Listen for media ended to auto-advance
    if (this.videoElement) {
      this.videoElement.addEventListener('ended', () => this.onMediaEnded());
    }

    // Listen for external events
    window.addEventListener('playlist:requestToggle', () => this.togglePanel());
  }

  /**
   * Create the playlist panel DOM
   */
  createPanel(parentElement) {
    if (this.container) return this.container;

    this.container = document.createElement('div');
    this.container.className = 'playlist-panel';
    this.container.innerHTML = this.buildPanelHTML();

    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    this.bindPanelEvents();
    this.renderItems();
    return this.container;
  }

  buildPanelHTML() {
    return `
      <div class="playlist-header">
        <h3 class="playlist-title">Playlist</h3>
        <div class="playlist-controls">
          <button class="playlist-btn playlist-shuffle-btn" title="Shuffle" data-active="${this.shuffleEnabled}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
          </button>
          <button class="playlist-btn playlist-repeat-btn" title="Repeat: ${this.repeatMode}" data-mode="${this.repeatMode}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            ${this.repeatMode === 'one' ? '<span class="repeat-one-indicator">1</span>' : ''}
          </button>
          <button class="playlist-btn playlist-import-btn" title="Import Playlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="playlist-btn playlist-export-btn" title="Export Playlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </button>
          <button class="playlist-btn playlist-add-btn" title="Add Files">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button class="playlist-btn playlist-close-btn" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="playlist-items-container">
        <div class="playlist-items"></div>
      </div>
      <div class="playlist-footer">
        <span class="playlist-count">${this.items.length} items</span>
        <button class="playlist-btn playlist-clear-btn" title="Clear All">Clear</button>
      </div>
      <input type="file" class="playlist-file-input" multiple accept="video/*,audio/*,.m3u,.m3u8,.json" style="display:none">
      <input type="file" class="playlist-import-input" accept=".m3u,.m3u8,.json" style="display:none">
    `;
  }

  bindPanelEvents() {
    if (!this.container) return;

    const shuffleBtn = this.container.querySelector('.playlist-shuffle-btn');
    const repeatBtn = this.container.querySelector('.playlist-repeat-btn');
    const importBtn = this.container.querySelector('.playlist-import-btn');
    const exportBtn = this.container.querySelector('.playlist-export-btn');
    const addBtn = this.container.querySelector('.playlist-add-btn');
    const closeBtn = this.container.querySelector('.playlist-close-btn');
    const clearBtn = this.container.querySelector('.playlist-clear-btn');
    const fileInput = this.container.querySelector('.playlist-file-input');
    const importInput = this.container.querySelector('.playlist-import-input');

    shuffleBtn.addEventListener('click', () => this.toggleShuffle());
    repeatBtn.addEventListener('click', () => this.cycleRepeatMode());
    importBtn.addEventListener('click', () => importInput.click());
    exportBtn.addEventListener('click', () => this.showExportMenu());
    addBtn.addEventListener('click', () => fileInput.click());
    closeBtn.addEventListener('click', () => this.togglePanel());
    clearBtn.addEventListener('click', () => this.clearPlaylist());

    fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    importInput.addEventListener('change', (e) => this.handleImport(e));
  }

  /**
   * Render playlist items with drag-drop support
   */
  renderItems() {
    if (!this.container) return;

    const itemsContainer = this.container.querySelector('.playlist-items');
    const countEl = this.container.querySelector('.playlist-count');

    if (!itemsContainer) return;

    itemsContainer.innerHTML = '';

    if (this.items.length === 0) {
      itemsContainer.innerHTML = `
        <div class="playlist-empty">
          <p>No items in playlist</p>
          <p class="playlist-empty-hint">Drop files here or click + to add</p>
        </div>
      `;
      if (countEl) countEl.textContent = '0 items';
      return;
    }

    this.items.forEach((item, index) => {
      const el = this.createItemElement(item, index);
      itemsContainer.appendChild(el);
    });

    if (countEl) countEl.textContent = `${this.items.length} item${this.items.length !== 1 ? 's' : ''}`;

    this.updateActiveHighlight();
  }

  createItemElement(item, index) {
    const el = document.createElement('div');
    el.className = `playlist-item${index === this.currentIndex ? ' active' : ''}`;
    el.dataset.index = index;
    el.draggable = true;

    el.innerHTML = `
      <div class="playlist-item-drag-handle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/>
          <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
          <circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
        </svg>
      </div>
      <div class="playlist-item-thumbnail">
        ${item.thumbnail ? `<img src="${item.thumbnail}" alt="">` : '<div class="playlist-item-thumb-placeholder"></div>'}
      </div>
      <div class="playlist-item-info">
        <span class="playlist-item-title">${this.escapeHTML(item.title || item.name || 'Unknown')}</span>
        <span class="playlist-item-duration">${item.duration ? this.formatTime(item.duration) : '--:--'}</span>
      </div>
      <button class="playlist-item-remove" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Drag events
    el.addEventListener('dragstart', (e) => this.onDragStart(e, index));
    el.addEventListener('dragover', (e) => this.onDragOver(e, index));
    el.addEventListener('dragenter', (e) => this.onDragEnter(e));
    el.addEventListener('dragleave', (e) => this.onDragLeave(e));
    el.addEventListener('drop', (e) => this.onDrop(e, index));
    el.addEventListener('dragend', (e) => this.onDragEnd(e));

    // Click to play
    el.querySelector('.playlist-item-info').addEventListener('click', () => this.playIndex(index));

    // Remove button
    el.querySelector('.playlist-item-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeItem(index);
    });

    return el;
  }

  // Drag and Drop handlers
  onDragStart(e, index) {
    this.dragSourceIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.classList.add('dragging');
  }

  onDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  onDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  onDrop(e, targetIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const sourceIndex = this.dragSourceIndex;
    if (sourceIndex === undefined || sourceIndex === targetIndex) return;

    this.reorderItem(sourceIndex, targetIndex);
  }

  onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    if (this.container) {
      this.container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }
  }

  /**
   * Add item to playlist
   */
  addItem(item) {
    const playlistItem = {
      id: this.generateId(),
      name: item.name || item.title || 'Unknown',
      title: item.title || item.name || 'Unknown',
      src: item.src || item.url || '',
      type: item.type || 'video',
      duration: item.duration || 0,
      thumbnail: item.thumbnail || null,
      file: item.file || null
    };

    this.items.push(playlistItem);
    this.updateShuffleOrder();
    this.saveToStorage();
    this.renderItems();
    this.emitEvent('playlist:add', { item: playlistItem, index: this.items.length - 1 });

    // Generate thumbnail if file available
    if (playlistItem.file && playlistItem.type === 'video') {
      this.generateThumbnail(playlistItem);
    }

    return playlistItem;
  }

  /**
   * Remove item from playlist
   */
  removeItem(index) {
    if (index < 0 || index >= this.items.length) return;

    const removed = this.items.splice(index, 1)[0];

    if (this.currentIndex === index) {
      this.currentIndex = -1;
    } else if (this.currentIndex > index) {
      this.currentIndex--;
    }

    this.updateShuffleOrder();
    this.saveToStorage();
    this.renderItems();
    this.emitEvent('playlist:remove', { item: removed, index });
  }

  /**
   * Reorder item from one position to another
   */
  reorderItem(fromIndex, toIndex) {
    const [item] = this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, item);

    // Update current index if needed
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }

    this.updateShuffleOrder();
    this.saveToStorage();
    this.renderItems();
    this.emitEvent('playlist:reorder', { fromIndex, toIndex });
  }

  /**
   * Play item at index
   */
  playIndex(index) {
    if (index < 0 || index >= this.items.length) return;

    this.currentIndex = index;
    const item = this.items[index];

    this.updateActiveHighlight();
    this.emitEvent('playlist:advance', { item, index });

    // If we have a video element, set source
    if (this.videoElement && item.src) {
      this.videoElement.src = item.src;
      this.videoElement.play().catch(() => {});
    }
  }

  /**
   * Auto-advance on media ended
   */
  onMediaEnded() {
    if (this.repeatMode === 'one') {
      if (this.videoElement) {
        this.videoElement.currentTime = 0;
        this.videoElement.play().catch(() => {});
      }
      return;
    }

    const nextIndex = this.getNextIndex();
    if (nextIndex !== -1) {
      this.playIndex(nextIndex);
    }
  }

  getNextIndex() {
    if (this.items.length === 0) return -1;

    if (this.shuffleEnabled) {
      const currentShufflePos = this.shuffleOrder.indexOf(this.currentIndex);
      const nextShufflePos = currentShufflePos + 1;

      if (nextShufflePos < this.shuffleOrder.length) {
        return this.shuffleOrder[nextShufflePos];
      } else if (this.repeatMode === 'all') {
        this.updateShuffleOrder();
        return this.shuffleOrder[0];
      }
      return -1;
    }

    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.items.length) {
      return nextIndex;
    } else if (this.repeatMode === 'all') {
      return 0;
    }
    return -1;
  }

  getPreviousIndex() {
    if (this.items.length === 0) return -1;

    if (this.shuffleEnabled) {
      const currentShufflePos = this.shuffleOrder.indexOf(this.currentIndex);
      if (currentShufflePos > 0) {
        return this.shuffleOrder[currentShufflePos - 1];
      }
      return -1;
    }

    const prevIndex = this.currentIndex - 1;
    if (prevIndex >= 0) {
      return prevIndex;
    } else if (this.repeatMode === 'all') {
      return this.items.length - 1;
    }
    return -1;
  }

  /**
   * Next/Previous track
   */
  next() {
    const nextIndex = this.getNextIndex();
    if (nextIndex !== -1) this.playIndex(nextIndex);
  }

  previous() {
    const prevIndex = this.getPreviousIndex();
    if (prevIndex !== -1) this.playIndex(prevIndex);
  }

  /**
   * Shuffle mode
   */
  toggleShuffle() {
    this.shuffleEnabled = !this.shuffleEnabled;
    this.updateShuffleOrder();
    this.updateShuffleUI();
    this.saveToStorage();
    this.emitEvent('playlist:modechange', { shuffle: this.shuffleEnabled, repeat: this.repeatMode });
  }

  updateShuffleOrder() {
    this.shuffleOrder = [...Array(this.items.length).keys()];
    if (this.shuffleEnabled) {
      // Fisher-Yates shuffle
      for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
      }
    }
  }

  updateShuffleUI() {
    if (!this.container) return;
    const btn = this.container.querySelector('.playlist-shuffle-btn');
    if (btn) {
      btn.dataset.active = this.shuffleEnabled;
      btn.classList.toggle('active', this.shuffleEnabled);
    }
  }

  /**
   * Repeat mode
   */
  cycleRepeatMode() {
    const modes = ['none', 'all', 'one'];
    const currentIdx = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(currentIdx + 1) % modes.length];
    this.updateRepeatUI();
    this.saveToStorage();
    this.emitEvent('playlist:modechange', { shuffle: this.shuffleEnabled, repeat: this.repeatMode });
  }

  updateRepeatUI() {
    if (!this.container) return;
    const btn = this.container.querySelector('.playlist-repeat-btn');
    if (btn) {
      btn.dataset.mode = this.repeatMode;
      btn.classList.toggle('active', this.repeatMode !== 'none');
      const indicator = btn.querySelector('.repeat-one-indicator');
      if (this.repeatMode === 'one') {
        if (!indicator) {
          const span = document.createElement('span');
          span.className = 'repeat-one-indicator';
          span.textContent = '1';
          btn.appendChild(span);
        }
      } else if (indicator) {
        indicator.remove();
      }
    }
  }

  /**
   * Import from M3U format
   */
  parseM3U(content) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    const items = [];
    let currentItem = {};

    for (const line of lines) {
      if (line.startsWith('#EXTM3U')) continue;

      if (line.startsWith('#EXTINF:')) {
        const match = line.match(/#EXTINF:(-?\d+\.?\d*),(.+)/);
        if (match) {
          currentItem.duration = parseFloat(match[1]);
          currentItem.title = match[2].trim();
        }
      } else if (!line.startsWith('#')) {
        currentItem.src = line;
        currentItem.name = currentItem.title || line.split('/').pop();
        items.push({ ...currentItem });
        currentItem = {};
      }
    }

    return items;
  }

  /**
   * Import from JSON format
   */
  parseJSON(content) {
    try {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : (data.items || data.playlist || []);
      return arr.map(item => ({
        name: item.name || item.title || 'Unknown',
        title: item.title || item.name || 'Unknown',
        src: item.src || item.url || item.file || '',
        duration: item.duration || 0,
        type: item.type || 'video'
      }));
    } catch (e) {
      console.warn('Failed to parse JSON playlist:', e);
      return [];
    }
  }

  /**
   * Export to M3U format
   */
  exportM3U() {
    let m3u = '#EXTM3U\n';
    for (const item of this.items) {
      m3u += `#EXTINF:${Math.round(item.duration || -1)},${item.title || item.name}\n`;
      m3u += `${item.src}\n`;
    }
    return m3u;
  }

  /**
   * Export to JSON format
   */
  exportJSON() {
    const exportItems = this.items.map(item => ({
      title: item.title,
      src: item.src,
      duration: item.duration,
      type: item.type
    }));
    return JSON.stringify({ playlist: exportItems }, null, 2);
  }

  /**
   * Handle file import
   */
  async handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const content = await file.text();
    let items = [];

    if (file.name.endsWith('.m3u') || file.name.endsWith('.m3u8')) {
      items = this.parseM3U(content);
    } else if (file.name.endsWith('.json')) {
      items = this.parseJSON(content);
    }

    items.forEach(item => this.addItem(item));
    e.target.value = '';
  }

  /**
   * Handle batch file upload
   */
  handleFileUpload(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const src = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio/');
      this.addItem({
        name: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
        src: src,
        type: isAudio ? 'audio' : 'video',
        file: file
      });
    });
    e.target.value = '';
  }

  /**
   * Show export menu
   */
  showExportMenu() {
    if (this.items.length === 0) return;

    const menu = document.createElement('div');
    menu.className = 'playlist-export-menu';
    menu.innerHTML = `
      <button class="playlist-export-option" data-format="m3u">Export as M3U</button>
      <button class="playlist-export-option" data-format="json">Export as JSON</button>
    `;

    menu.addEventListener('click', (e) => {
      const format = e.target.dataset.format;
      if (format === 'm3u') {
        this.downloadFile('playlist.m3u', this.exportM3U(), 'audio/x-mpegurl');
      } else if (format === 'json') {
        this.downloadFile('playlist.json', this.exportJSON(), 'application/json');
      }
      menu.remove();
    });

    // Position near export button
    const exportBtn = this.container.querySelector('.playlist-export-btn');
    if (exportBtn) {
      exportBtn.parentElement.appendChild(menu);
      setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
      }, 10);
    }
  }

  downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Generate thumbnail for video file
   */
  generateThumbnail(item) {
    if (!item.file) return;

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    video.addEventListener('loadeddata', () => {
      // Seek to 25% of the video for a representative frame
      video.currentTime = video.duration * 0.25;
    });

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 68;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      item.thumbnail = canvas.toDataURL('image/jpeg', 0.6);
      URL.revokeObjectURL(video.src);
      this.renderItems();
      this.saveToStorage();
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src);
    });

    video.src = URL.createObjectURL(item.file);
  }

  /**
   * Clear playlist
   */
  clearPlaylist() {
    this.items = [];
    this.currentIndex = -1;
    this.shuffleOrder = [];
    this.saveToStorage();
    this.renderItems();
  }

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    this.panelVisible = !this.panelVisible;
    if (this.container) {
      this.container.classList.toggle('visible', this.panelVisible);
    }
  }

  /**
   * Update active item highlight
   */
  updateActiveHighlight() {
    if (!this.container) return;
    const items = this.container.querySelectorAll('.playlist-item');
    items.forEach((el, idx) => {
      el.classList.toggle('active', idx === this.currentIndex);
    });
  }

  /**
   * localStorage persistence
   */
  saveToStorage() {
    try {
      const data = {
        items: this.items.map(item => ({
          ...item,
          file: undefined // Cannot serialize File objects
        })),
        currentIndex: this.currentIndex,
        repeatMode: this.repeatMode,
        shuffleEnabled: this.shuffleEnabled
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save playlist to localStorage:', e);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.items = data.items || [];
        this.currentIndex = data.currentIndex || -1;
        this.repeatMode = data.repeatMode || 'none';
        this.shuffleEnabled = data.shuffleEnabled || false;
        this.updateShuffleOrder();
      }
    } catch (e) {
      console.warn('Failed to load playlist from localStorage:', e);
    }
  }

  /**
   * Emit custom event
   */
  emitEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  /**
   * Utility methods
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
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

  /**
   * Get current state
   */
  getState() {
    return {
      items: this.items,
      currentIndex: this.currentIndex,
      repeatMode: this.repeatMode,
      shuffleEnabled: this.shuffleEnabled,
      count: this.items.length
    };
  }
}

// Export for use in other modules
window.PlaylistManager = PlaylistManager;
