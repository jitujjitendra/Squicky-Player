/**
 * Media Info Panel
 * Displays detailed information about loaded media
 */

class MediaInfoPanel {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.formatDetector = new FormatDetector();
    this.currentMedia = null;
  }

  /**
   * Create and inject the panel into DOM
   */
  create() {
    if (this.panel) return;

    this.panel = document.createElement('div');
    this.panel.className = 'media-info-panel';
    this.panel.innerHTML = `
      <div class="media-info-header">
        <h3>📊 Media Information</h3>
        <button class="media-info-close" aria-label="Close">&times;</button>
      </div>
      <div class="media-info-content">
        <div class="media-info-loading">
          <div class="spinner"></div>
          <p>Analyzing media...</p>
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);

    // Close button
    this.panel.querySelector('.media-info-close').addEventListener('click', () => {
      this.hide();
    });

    // Click outside to close
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) {
        this.hide();
      }
    });
  }

  /**
   * Show panel with media info
   */
  async show(file, mediaElement) {
    this.create();
    this.panel.classList.add('visible');
    this.isVisible = true;

    // Show loading state
    const content = this.panel.querySelector('.media-info-content');
    content.innerHTML = `
      <div class="media-info-loading">
        <div class="spinner"></div>
        <p>Analyzing media...</p>
      </div>
    `;

    // Get format info
    const formatInfo = this.formatDetector.getFormatInfo(file.name);
    
    // Extract metadata
    const metadata = await this.formatDetector.extractMediaInfo(file);

    // Build info display
    content.innerHTML = this.buildInfoHTML(formatInfo, metadata, file, mediaElement);

    this.currentMedia = { file, formatInfo, metadata };
  }

  /**
   * Build info panel HTML
   */
  buildInfoHTML(formatInfo, metadata, file, mediaElement) {
    const isVideo = metadata.width && metadata.height;
    const isAudio = !isVideo;

    return `
      <!-- Format Info -->
      <div class="media-info-section">
        <h4>📁 Format</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Type</span>
            <span class="info-value">
              ${formatInfo.icon} ${formatInfo.label}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="info-value ${formatInfo.status}">
              ${formatInfo.status === 'compatible' ? '✅' : '⚠️'} ${formatInfo.status}
            </span>
          </div>
          ${formatInfo.warning ? `
          <div class="info-item full-width">
            <span class="info-warning">⚠️ ${formatInfo.warning}</span>
          </div>
          ` : ''}
          <div class="info-item full-width">
            <span class="info-label">Recommendation</span>
            <span class="info-value">${formatInfo.recommendation}</span>
          </div>
        </div>
      </div>

      <!-- File Info -->
      <div class="media-info-section">
        <h4>📄 File</h4>
        <div class="info-grid">
          <div class="info-item full-width">
            <span class="info-label">Filename</span>
            <span class="info-value filename">${file.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Size</span>
            <span class="info-value">${metadata.fileSizeMB} MB</span>
          </div>
          <div class="info-item">
            <span class="info-label">MIME Type</span>
            <span class="info-value">${metadata.mimeType || 'Unknown'}</span>
          </div>
        </div>
      </div>

      ${isVideo ? `
      <!-- Video Info -->
      <div class="media-info-section">
        <h4>🎬 Video</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Resolution</span>
            <span class="info-value quality-badge">
              ${metadata.width} × ${metadata.height} (${metadata.quality?.label || 'Unknown'})
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Aspect Ratio</span>
            <span class="info-value">${metadata.aspectRatio?.toFixed(2) || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Duration</span>
            <span class="info-value">${this.formatDuration(metadata.duration)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Estimated Quality</span>
            <span class="info-value">
              <span class="quality-badge ${metadata.quality?.tier}">${metadata.quality?.badge || 'Unknown'}</span>
            </span>
          </div>
        </div>
      </div>
      ` : ''}

      ${isAudio ? `
      <!-- Audio Info -->
      <div class="media-info-section">
        <h4>🔊 Audio</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Duration</span>
            <span class="info-value">${this.formatDuration(metadata.duration)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Quality</span>
            <span class="info-value">${formatInfo.quality || 'Unknown'}</span>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Browser Compatibility -->
      <div class="media-info-section">
        <h4>🌐 Browser</h4>
        <div class="info-grid">
          ${this.buildCompatibilityHTML()}
        </div>
      </div>

      <!-- Actions -->
      <div class="media-info-actions">
        <button class="btn-secondary" onclick="window.mediaInfoPanel.hide()">Close</button>
        <button class="btn-primary" onclick="window.mediaInfoPanel.copyInfo()">Copy Info</button>
      </div>
    `;
  }

  /**
   * Build compatibility HTML
   */
  buildCompatibilityHTML() {
    const report = this.formatDetector.generateCapabilityReport();
    const { browser, device } = report;

    return `
      <div class="info-item">
        <span class="info-label">Browser</span>
        <span class="info-value">${browser.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Device</span>
        <span class="info-value">
          ${device.isMobile ? '📱 Mobile' : device.isTablet ? '📱 Tablet' : '💻 Desktop'}
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">Screen</span>
        <span class="info-value">${device.screenWidth} × ${device.screenHeight}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Pixel Ratio</span>
        <span class="info-value">${device.pixelRatio}x</span>
      </div>
    `;
  }

  /**
   * Format duration in readable format
   */
  formatDuration(seconds) {
    if (!seconds || !Number.isFinite(seconds)) return 'Unknown';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    } else if (m > 0) {
      return `${m}m ${s}s`;
    } else {
      return `${s}s`;
    }
  }

  /**
   * Copy media info to clipboard
   */
  copyInfo() {
    if (!this.currentMedia) return;

    const { formatInfo, metadata, file } = this.currentMedia;
    
    const text = `
Squicky Player - Media Information
====================================

File: ${file.name}
Size: ${metadata.fileSizeMB} MB
Format: ${formatInfo.label}
Status: ${formatInfo.status}

${metadata.width ? `
Resolution: ${metadata.width} × ${metadata.height}
Quality: ${metadata.quality?.label || 'Unknown'}
` : ''}
Duration: ${this.formatDuration(metadata.duration)}

Recommendation: ${formatInfo.recommendation}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      this.showCopyToast();
    });
  }

  /**
   * Show copy success toast
   */
  showCopyToast() {
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = '✓ Copied to clipboard';
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Hide panel
   */
  hide() {
    if (this.panel) {
      this.panel.classList.remove('visible');
      this.isVisible = false;
    }
  }

  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else if (this.currentMedia) {
      this.panel.classList.add('visible');
      this.isVisible = true;
    }
  }

  /**
   * Destroy panel
   */
  destroy() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    this.currentMedia = null;
  }
}

// Global instance
window.mediaInfoPanel = new MediaInfoPanel();
window.MediaInfoPanel = MediaInfoPanel;
