/**
 * Timeline Enhancements Module
 * Thumbnail preview, chapter markers, waveform visualization,
 * buffered regions, seek preview, timeline zoom
 */

class TimelineEnhancements {
  constructor(options = {}) {
    this.videoElement = options.videoElement || null;
    this.timelineElement = options.timelineElement || null;
    this.container = null;

    // Chapters
    this.chapters = [];
    this.chapterMarkers = [];

    // Thumbnail preview
    this.thumbnailSprites = null; // WebVTT sprite sheet data
    this.previewCanvas = null;
    this.previewVideo = null;

    // Waveform
    this.audioContext = null;
    this.analyser = null;
    this.waveformCanvas = null;
    this.waveformData = null;

    // Zoom
    this.zoomLevel = 1;
    this.zoomStart = 0; // normalized 0-1
    this.zoomEnd = 1;   // normalized 0-1
    this.minZoom = 1;
    this.maxZoom = 10;

    // State
    this.isHovering = false;
    this.hoverPosition = 0;

    this.init();
  }

  init() {
    if (this.timelineElement) {
      this.setupTimeline();
    }

    if (this.videoElement) {
      this.videoElement.addEventListener('progress', () => this.updateBuffered());
      this.videoElement.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
    }
  }

  /**
   * Setup timeline with all enhancements
   */
  setupTimeline() {
    // Create wrapper for enhanced timeline
    this.container = document.createElement('div');
    this.container.className = 'timeline-enhanced';

    // Thumbnail preview popup
    this.previewPopup = document.createElement('div');
    this.previewPopup.className = 'timeline-preview-popup';
    this.previewPopup.innerHTML = `
      <canvas class="timeline-preview-canvas" width="160" height="90"></canvas>
      <span class="timeline-preview-time"></span>
    `;
    this.previewCanvas = this.previewPopup.querySelector('.timeline-preview-canvas');
    this.container.appendChild(this.previewPopup);

    // Buffered regions overlay
    this.bufferedOverlay = document.createElement('div');
    this.bufferedOverlay.className = 'timeline-buffered-overlay';
    this.container.appendChild(this.bufferedOverlay);

    // Chapter markers container
    this.chapterMarkersContainer = document.createElement('div');
    this.chapterMarkersContainer.className = 'timeline-chapter-markers';
    this.container.appendChild(this.chapterMarkersContainer);

    // Chapter navigation popup
    this.chapterNav = document.createElement('div');
    this.chapterNav.className = 'timeline-chapter-nav';
    this.container.appendChild(this.chapterNav);

    // Time tooltip
    this.timeTooltip = document.createElement('div');
    this.timeTooltip.className = 'timeline-time-tooltip';
    this.container.appendChild(this.timeTooltip);

    // Zoom controls
    this.zoomControls = document.createElement('div');
    this.zoomControls.className = 'timeline-zoom-controls';
    this.zoomControls.innerHTML = `
      <button class="timeline-zoom-btn zoom-out" title="Zoom Out">-</button>
      <span class="timeline-zoom-level">1x</span>
      <button class="timeline-zoom-btn zoom-in" title="Zoom In">+</button>
      <button class="timeline-zoom-btn zoom-reset" title="Reset Zoom">Reset</button>
    `;
    this.container.appendChild(this.zoomControls);

    // Waveform canvas
    this.waveformCanvas = document.createElement('canvas');
    this.waveformCanvas.className = 'timeline-waveform-canvas';
    this.waveformCanvas.width = 800;
    this.waveformCanvas.height = 40;
    this.container.appendChild(this.waveformCanvas);

    // Insert container near timeline
    if (this.timelineElement && this.timelineElement.parentElement) {
      this.timelineElement.parentElement.insertBefore(this.container, this.timelineElement);
    }

    this.bindTimelineEvents();
  }

  bindTimelineEvents() {
    const timeline = this.timelineElement || this.container;

    // Mouse move for preview
    timeline.addEventListener('mousemove', (e) => this.onTimelineHover(e));
    timeline.addEventListener('mouseenter', () => {
      this.isHovering = true;
      this.previewPopup.classList.add('visible');
      this.timeTooltip.classList.add('visible');
    });
    timeline.addEventListener('mouseleave', () => {
      this.isHovering = false;
      this.previewPopup.classList.remove('visible');
      this.timeTooltip.classList.remove('visible');
    });

    // Zoom controls
    const zoomIn = this.zoomControls.querySelector('.zoom-in');
    const zoomOut = this.zoomControls.querySelector('.zoom-out');
    const zoomReset = this.zoomControls.querySelector('.zoom-reset');

    zoomIn.addEventListener('click', () => this.zoomIn());
    zoomOut.addEventListener('click', () => this.zoomOut());
    zoomReset.addEventListener('click', () => this.resetZoom());

    // Wheel zoom
    timeline.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) this.zoomIn(e);
        else this.zoomOut(e);
      }
    }, { passive: false });

    // Touch pinch zoom
    let initialPinchDistance = 0;
    let initialZoom = 1;

    timeline.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        initialPinchDistance = this.getTouchDistance(e.touches);
        initialZoom = this.zoomLevel;
      }
    });

    timeline.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const distance = this.getTouchDistance(e.touches);
        const scale = distance / initialPinchDistance;
        this.setZoom(initialZoom * scale);
      }
    }, { passive: false });
  }

  /**
   * Handle timeline hover - show preview and time
   */
  onTimelineHover(e) {
    if (!this.timelineElement) return;

    const rect = this.timelineElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));

    // Adjust for zoom
    const adjustedPercent = this.zoomStart + percent * (this.zoomEnd - this.zoomStart);
    this.hoverPosition = adjustedPercent;

    const duration = this.videoElement ? this.videoElement.duration : 0;
    const time = adjustedPercent * duration;

    // Update time tooltip
    this.timeTooltip.textContent = this.formatTime(time);
    this.timeTooltip.style.left = `${x}px`;

    // Update preview popup position
    const popupWidth = 160;
    let popupLeft = x - popupWidth / 2;
    popupLeft = Math.max(0, Math.min(rect.width - popupWidth, popupLeft));
    this.previewPopup.style.left = `${popupLeft}px`;

    // Generate thumbnail preview
    this.updatePreview(time);
  }

  /**
   * Update thumbnail preview
   */
  updatePreview(time) {
    if (this.thumbnailSprites) {
      this.renderSpritePreview(time);
    } else {
      this.renderVideoPreview(time);
    }
  }

  /**
   * Render preview from WebVTT sprite sheet
   */
  renderSpritePreview(time) {
    if (!this.thumbnailSprites || !this.previewCanvas) return;

    const sprite = this.findSpriteForTime(time);
    if (!sprite) return;

    const ctx = this.previewCanvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      ctx.drawImage(
        img,
        sprite.x, sprite.y, sprite.w, sprite.h,
        0, 0, this.previewCanvas.width, this.previewCanvas.height
      );
    };
    img.src = sprite.url;
  }

  /**
   * Render preview by seeking a hidden video element
   */
  renderVideoPreview(time) {
    if (!this.videoElement || !this.previewCanvas) return;

    // Use a hidden video for preview to avoid disrupting playback
    if (!this.previewVideo) {
      this.previewVideo = document.createElement('video');
      this.previewVideo.preload = 'auto';
      this.previewVideo.muted = true;
      this.previewVideo.src = this.videoElement.currentSrc || this.videoElement.src;
    }

    // Throttle seeks
    if (this._previewSeekTimeout) return;
    this._previewSeekTimeout = setTimeout(() => {
      this._previewSeekTimeout = null;
    }, 200);

    this.previewVideo.currentTime = time;
    this.previewVideo.addEventListener('seeked', () => {
      const ctx = this.previewCanvas.getContext('2d');
      ctx.drawImage(this.previewVideo, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
    }, { once: true });
  }

  findSpriteForTime(time) {
    if (!this.thumbnailSprites || !this.thumbnailSprites.entries) return null;

    for (const entry of this.thumbnailSprites.entries) {
      if (time >= entry.startTime && time <= entry.endTime) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Load WebVTT thumbnail sprite data
   */
  loadThumbnailSprites(vttUrl) {
    fetch(vttUrl)
      .then(r => r.text())
      .then(text => {
        this.thumbnailSprites = this.parseVTTSprites(text, vttUrl);
      })
      .catch(e => console.warn('Failed to load thumbnail sprites:', e));
  }

  parseVTTSprites(vttText, baseUrl) {
    const lines = vttText.split('\n');
    const entries = [];
    let i = 0;

    // Skip WEBVTT header
    while (i < lines.length && !lines[i].includes('-->')) i++;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (line.includes('-->')) {
        const [start, end] = line.split('-->').map(t => this.parseVTTTime(t.trim()));
        i++;
        if (i < lines.length) {
          const url = lines[i].trim();
          const match = url.match(/(.+)#xywh=(\d+),(\d+),(\d+),(\d+)/);
          if (match) {
            const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
            entries.push({
              startTime: start,
              endTime: end,
              url: basePath + match[1],
              x: parseInt(match[2]),
              y: parseInt(match[3]),
              w: parseInt(match[4]),
              h: parseInt(match[5])
            });
          }
        }
      }
      i++;
    }

    return { entries };
  }

  parseVTTTime(timeStr) {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return 0;
  }

  /**
   * Chapter markers
   */
  setChapters(chapters) {
    this.chapters = chapters.map((ch, idx) => ({
      id: idx,
      title: ch.title || `Chapter ${idx + 1}`,
      startTime: ch.startTime || ch.start || 0,
      endTime: ch.endTime || ch.end || 0
    }));

    this.renderChapterMarkers();
    this.renderChapterNav();
  }

  renderChapterMarkers() {
    if (!this.chapterMarkersContainer || !this.videoElement) return;

    const duration = this.videoElement.duration || 1;
    this.chapterMarkersContainer.innerHTML = '';

    this.chapters.forEach((chapter, idx) => {
      const percent = (chapter.startTime / duration) * 100;
      const marker = document.createElement('div');
      marker.className = 'chapter-marker';
      marker.style.left = `${percent}%`;
      marker.title = chapter.title;
      marker.dataset.index = idx;

      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.seekToChapter(idx);
      });

      this.chapterMarkersContainer.appendChild(marker);
    });
  }

  renderChapterNav() {
    if (!this.chapterNav) return;

    this.chapterNav.innerHTML = `
      <div class="chapter-nav-header">
        <h4>Chapters</h4>
        <button class="chapter-nav-close">x</button>
      </div>
      <div class="chapter-nav-list">
        ${this.chapters.map((ch, idx) => `
          <div class="chapter-nav-item" data-index="${idx}">
            <span class="chapter-nav-time">${this.formatTime(ch.startTime)}</span>
            <span class="chapter-nav-title">${this.escapeHTML(ch.title)}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Bind events
    this.chapterNav.querySelector('.chapter-nav-close').addEventListener('click', () => {
      this.chapterNav.classList.remove('visible');
    });

    this.chapterNav.querySelectorAll('.chapter-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.seekToChapter(parseInt(item.dataset.index));
      });
    });
  }

  seekToChapter(index) {
    if (index < 0 || index >= this.chapters.length) return;
    const chapter = this.chapters[index];

    if (this.videoElement) {
      this.videoElement.currentTime = chapter.startTime;
    }

    this.emitEvent('timeline:chapterclick', { chapter, index });
  }

  toggleChapterNav() {
    if (this.chapterNav) {
      this.chapterNav.classList.toggle('visible');
    }
  }

  /**
   * Waveform visualization (Web Audio API)
   */
  async generateWaveform() {
    if (!this.videoElement || !this.waveformCanvas) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const source = this.audioContext.createMediaElementSource(this.videoElement);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.drawWaveform();
    } catch (e) {
      console.warn('Failed to create waveform:', e);
    }
  }

  /**
   * Generate static waveform from audio buffer
   */
  async generateStaticWaveform(audioUrl) {
    if (!this.waveformCanvas) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      this.waveformData = this.extractWaveformData(audioBuffer);
      this.drawStaticWaveform();
    } catch (e) {
      console.warn('Failed to generate static waveform:', e);
    }
  }

  extractWaveformData(audioBuffer) {
    const channel = audioBuffer.getChannelData(0);
    const samples = this.waveformCanvas.width;
    const blockSize = Math.floor(channel.length / samples);
    const data = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channel[start + j]);
      }
      data[i] = sum / blockSize;
    }

    return data;
  }

  drawStaticWaveform() {
    if (!this.waveformCanvas || !this.waveformData) return;

    const canvas = this.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Get computed styles for theming
    const style = getComputedStyle(document.documentElement);
    const color = style.getPropertyValue('--brand-primary').trim() || '#6366f1';

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;

    const barWidth = width / this.waveformData.length;
    const maxVal = Math.max(...this.waveformData);

    for (let i = 0; i < this.waveformData.length; i++) {
      const normalized = this.waveformData[i] / maxVal;
      const barHeight = normalized * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    ctx.globalAlpha = 1;
  }

  drawWaveform() {
    if (!this.analyser || !this.waveformCanvas) return;

    const canvas = this.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.analyser) return;
      requestAnimationFrame(draw);

      this.analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const style = getComputedStyle(document.documentElement);
      const color = style.getPropertyValue('--brand-primary').trim() || '#6366f1';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;

      const barWidth = canvas.width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }

      ctx.globalAlpha = 1;
    };

    draw();
  }

  /**
   * Buffered regions indicator
   */
  updateBuffered() {
    if (!this.videoElement || !this.bufferedOverlay) return;

    const buffered = this.videoElement.buffered;
    const duration = this.videoElement.duration || 1;

    this.bufferedOverlay.innerHTML = '';

    for (let i = 0; i < buffered.length; i++) {
      const start = (buffered.start(i) / duration) * 100;
      const end = (buffered.end(i) / duration) * 100;

      const region = document.createElement('div');
      region.className = 'buffered-region';
      region.style.left = `${start}%`;
      region.style.width = `${end - start}%`;
      this.bufferedOverlay.appendChild(region);
    }
  }

  /**
   * Zoom controls
   */
  zoomIn(event) {
    const newZoom = Math.min(this.maxZoom, this.zoomLevel * 1.5);
    this.setZoom(newZoom, event);
  }

  zoomOut(event) {
    const newZoom = Math.max(this.minZoom, this.zoomLevel / 1.5);
    this.setZoom(newZoom, event);
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.zoomStart = 0;
    this.zoomEnd = 1;
    this.updateZoomUI();
    this.emitEvent('timeline:zoom', { level: 1, start: 0, end: 1 });
  }

  setZoom(level, event) {
    const oldZoom = this.zoomLevel;
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));

    // Calculate visible range
    const visibleRange = 1 / this.zoomLevel;
    const center = (this.zoomStart + this.zoomEnd) / 2;

    // If event provided, zoom toward cursor position
    if (event && this.timelineElement) {
      const rect = this.timelineElement.getBoundingClientRect();
      const x = (event.clientX || (rect.left + rect.width / 2)) - rect.left;
      const percent = x / rect.width;
      const timelinePos = this.zoomStart + percent * (this.zoomEnd - this.zoomStart);

      this.zoomStart = Math.max(0, timelinePos - visibleRange / 2);
      this.zoomEnd = Math.min(1, this.zoomStart + visibleRange);
      if (this.zoomEnd === 1) this.zoomStart = Math.max(0, 1 - visibleRange);
    } else {
      this.zoomStart = Math.max(0, center - visibleRange / 2);
      this.zoomEnd = Math.min(1, this.zoomStart + visibleRange);
    }

    this.updateZoomUI();
    this.emitEvent('timeline:zoom', {
      level: this.zoomLevel,
      start: this.zoomStart,
      end: this.zoomEnd
    });
  }

  updateZoomUI() {
    if (this.zoomControls) {
      const levelEl = this.zoomControls.querySelector('.timeline-zoom-level');
      if (levelEl) levelEl.textContent = `${this.zoomLevel.toFixed(1)}x`;
    }

    // Update chapter marker positions for zoom
    this.renderChapterMarkers();
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Called when video metadata loads
   */
  onMetadataLoaded() {
    this.updateBuffered();
    this.renderChapterMarkers();
  }

  /**
   * Utility methods
   */
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
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

  emitEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.previewVideo) {
      this.previewVideo.src = '';
      this.previewVideo = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  getState() {
    return {
      chapters: this.chapters,
      zoomLevel: this.zoomLevel,
      zoomStart: this.zoomStart,
      zoomEnd: this.zoomEnd,
      hasThumbnails: !!this.thumbnailSprites,
      hasWaveform: !!this.waveformData || !!this.analyser
    };
  }
}

// Export for use in other modules
window.TimelineEnhancements = TimelineEnhancements;
