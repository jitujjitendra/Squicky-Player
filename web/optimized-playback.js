/**
 * SQUICKY PLAYER - OPTIMIZED PLAYBACK
 * Enhanced file upload, validation, and native format support
 */

class OptimizedPlayback {
  constructor() {
    // Supported formats
    this.supportedFormats = {
      video: {
        'video/mp4': ['.mp4', '.m4v'],
        'video/webm': ['.webm'],
        'video/ogg': ['.ogv', '.ogg'],
        'video/quicktime': ['.mov'],
        'video/x-matroska': ['.mkv'],
        'video/x-msvideo': ['.avi'],
        'video/x-flv': ['.flv']
      },
      audio: {
        'audio/mpeg': ['.mp3'],
        'audio/mp4': ['.m4a', '.mp4'],
        'audio/ogg': ['.ogg', '.oga', '.opus'],
        'audio/wav': ['.wav'],
        'audio/flac': ['.flac'],
        'audio/aac': ['.aac'],
        'audio/webm': ['.webm']
      },
      subtitle: {
        'text/vtt': ['.vtt'],
        'application/x-subrip': ['.srt']
      }
    };
    
    // Format compatibility matrix
    this.browserCompatibility = this.detectBrowserCompatibility();
    
    this.init();
  }
  
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    this.enhanceDragDrop();
    this.enhanceFileInput();
    this.addFormatInfo();
  }
  
  /**
   * Detect Browser Compatibility
   */
  detectBrowserCompatibility() {
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    
    const compatibility = {
      video: {},
      audio: {}
    };
    
    // Test video formats
    const videoFormats = [
      { mime: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', name: 'MP4 (H.264)' },
      { mime: 'video/mp4; codecs="hev1.1.6.L93.B0"', name: 'MP4 (H.265/HEVC)' },
      { mime: 'video/webm; codecs="vp8, vorbis"', name: 'WebM (VP8)' },
      { mime: 'video/webm; codecs="vp9, opus"', name: 'WebM (VP9)' },
      { mime: 'video/webm; codecs="av01.0.05M.08, opus"', name: 'WebM (AV1)' },
      { mime: 'video/ogg; codecs="theora, vorbis"', name: 'Ogg (Theora)' }
    ];
    
    videoFormats.forEach(format => {
      const support = video.canPlayType(format.mime);
      compatibility.video[format.name] = support === 'probably' ? 'full' : 
                                         support === 'maybe' ? 'partial' : 'none';
    });
    
    // Test audio formats
    const audioFormats = [
      { mime: 'audio/mpeg', name: 'MP3' },
      { mime: 'audio/mp4; codecs="mp4a.40.2"', name: 'AAC' },
      { mime: 'audio/ogg; codecs="opus"', name: 'Opus' },
      { mime: 'audio/ogg; codecs="vorbis"', name: 'Ogg Vorbis' },
      { mime: 'audio/wav', name: 'WAV' },
      { mime: 'audio/flac', name: 'FLAC' }
    ];
    
    audioFormats.forEach(format => {
      const support = audio.canPlayType(format.mime);
      compatibility.audio[format.name] = support === 'probably' ? 'full' : 
                                         support === 'maybe' ? 'partial' : 'none';
    });
    
    return compatibility;
  }
  
  /**
   * Enhanced Drag & Drop
   */
  enhanceDragDrop() {
    const emptyState = document.getElementById('emptyState');
    if (!emptyState) return;
    
    let dragCounter = 0;
    
    // Prevent default drag behaviors on entire document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
    
    // Highlight drop zone on drag
    document.body.addEventListener('dragenter', (e) => {
      dragCounter++;
      if (dragCounter === 1) {
        emptyState.classList.add('dragging');
      }
    });
    
    document.body.addEventListener('dragleave', (e) => {
      dragCounter--;
      if (dragCounter === 0) {
        emptyState.classList.remove('dragging');
      }
    });
    
    // Handle drop
    document.body.addEventListener('drop', async (e) => {
      dragCounter = 0;
      emptyState.classList.remove('dragging');
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await this.handleFiles(files);
      }
    });
  }
  
  /**
   * Enhanced File Input
   */
  enhanceFileInput() {
    const browseButton = document.getElementById('browseButton');
    const fileInput = document.getElementById('fileInput');
    
    if (browseButton && fileInput) {
      // Update accepted formats
      const acceptedFormats = this.getAcceptedFormats();
      fileInput.setAttribute('accept', acceptedFormats.join(','));
      
      browseButton.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          await this.handleFiles(files);
        }
      });
    }
  }
  
  getAcceptedFormats() {
    const formats = [];
    
    Object.values(this.supportedFormats.video).forEach(exts => {
      formats.push(...exts);
    });
    
    Object.values(this.supportedFormats.audio).forEach(exts => {
      formats.push(...exts);
    });
    
    // Add mime types
    formats.push('video/*', 'audio/*');
    
    return formats;
  }
  
  /**
   * Handle File Upload
   */
  async handleFiles(files) {
    const validFiles = [];
    const invalidFiles = [];
    
    // Validate files
    for (const file of files) {
      const validation = this.validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, reason: validation.reason });
      }
    }
    
    // Show warnings for invalid files
    if (invalidFiles.length > 0) {
      this.showInvalidFilesWarning(invalidFiles);
    }
    
    // Process valid files
    if (validFiles.length > 0) {
      await this.processFiles(validFiles);
    }
  }
  
  /**
   * Validate File
   */
  validateFile(file) {
    // Check file size (max 10GB for local files)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (file.size > maxSize) {
      return {
        valid: false,
        reason: 'File too large (max 10GB)'
      };
    }
    
    // Check file type
    const fileType = this.detectFileType(file);
    if (!fileType) {
      return {
        valid: false,
        reason: 'Unsupported file format'
      };
    }
    
    // Check browser compatibility
    const compatibility = this.checkCompatibility(file, fileType);
    if (compatibility === 'none') {
      return {
        valid: false,
        reason: 'Format not supported by your browser'
      };
    }
    
    return { valid: true };
  }
  
  detectFileType(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    // Check video formats
    for (const [mime, exts] of Object.entries(this.supportedFormats.video)) {
      if (exts.some(ext => ext === `.${extension}`)) {
        return { type: 'video', mime, extension };
      }
    }
    
    // Check audio formats
    for (const [mime, exts] of Object.entries(this.supportedFormats.audio)) {
      if (exts.some(ext => ext === `.${extension}`)) {
        return { type: 'audio', mime, extension };
      }
    }
    
    // Check by mime type if extension check fails
    if (file.type.startsWith('video/')) {
      return { type: 'video', mime: file.type, extension };
    } else if (file.type.startsWith('audio/')) {
      return { type: 'audio', mime: file.type, extension };
    }
    
    return null;
  }
  
  checkCompatibility(file, fileType) {
    const mime = fileType.mime;
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    
    const element = fileType.type === 'video' ? video : audio;
    const support = element.canPlayType(mime);
    
    if (support === 'probably') return 'full';
    if (support === 'maybe') return 'partial';
    
    // Special handling for common formats
    const ext = fileType.extension;
    if (['mp4', 'webm', 'mp3', 'wav'].includes(ext)) {
      return 'full'; // These should work in modern browsers
    }
    
    return 'partial'; // Try to play it anyway
  }
  
  /**
   * Process Files
   */
  async processFiles(files) {
    this.showProcessing(true);
    
    try {
      // Get player element
      const player = document.querySelector('squicky-player');
      
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Load first file
      const firstFile = files[0];
      
      // Create object URL for the file
      const url = URL.createObjectURL(firstFile);
      
      // Prepare source object
      const source = {
        src: url,
        title: firstFile.name,
        type: this.detectFileType(firstFile)?.mime || firstFile.type,
        kind: firstFile.type.startsWith('video/') ? 'video' : 'audio'
      };
      
      // Load into player
      if (typeof player.loadFile === 'function') {
        await player.loadFile(firstFile);
      } else if (typeof player.load === 'function') {
        await player.load(source);
      } else {
        // Fallback: try to set src directly
        const mediaElement = player.querySelector('video, audio');
        if (mediaElement) {
          mediaElement.src = url;
          await mediaElement.load();
        }
      }
      
      // Add remaining files to queue if multiple
      if (files.length > 1) {
        this.addToQueue(files.slice(1));
      }
      
      // Show success
      this.showSuccess(`Loaded: ${firstFile.name}`);
      
    } catch (error) {
      console.error('Playback error:', error);
      this.showError(`Failed to load file: ${error.message}`);
    } finally {
      this.showProcessing(false);
    }
  }
  
  addToQueue(files) {
    // Queue functionality would integrate with existing queue system
    console.log('Adding to queue:', files);
  }
  
  /**
   * Format Information Display
   */
  addFormatInfo() {
    const formatRow = document.querySelector('.format-row');
    if (!formatRow) return;
    
    // Clear existing formats
    formatRow.innerHTML = '';
    
    // Add supported formats with compatibility indicators
    const formats = [
      { name: 'MP4', type: 'video', codec: 'MP4 (H.264)' },
      { name: 'WEBM', type: 'video', codec: 'WebM (VP9)' },
      { name: 'MP3', type: 'audio', codec: 'MP3' },
      { name: 'MKV', type: 'video', codec: 'MKV', note: 'May need conversion' },
      { name: 'FLAC', type: 'audio', codec: 'FLAC' },
      { name: 'M3U8', type: 'stream', note: 'HLS' },
      { name: 'MPD', type: 'stream', note: 'DASH' }
    ];
    
    formats.forEach(format => {
      const span = document.createElement('span');
      span.textContent = format.name;
      
      // Add compatibility indicator
      if (format.codec) {
        const compat = this.browserCompatibility[format.type]?.[format.codec];
        if (compat === 'full') {
          span.style.color = 'var(--success, #34d399)';
        } else if (compat === 'partial') {
          span.style.color = 'var(--warning, #f59e0b)';
        } else if (compat === 'none') {
          span.style.opacity = '0.4';
        }
      }
      
      if (format.note) {
        span.title = format.note;
      }
      
      formatRow.appendChild(span);
    });
  }
  
  /**
   * UI Feedback
   */
  showProcessing(show) {
    const emptyState = document.getElementById('emptyState');
    if (!emptyState) return;
    
    if (show) {
      emptyState.classList.add('processing');
    } else {
      emptyState.classList.remove('processing');
    }
  }
  
  showSuccess(message) {
    this.showToast(message, 'success');
  }
  
  showError(message) {
    this.showToast(message, 'error');
  }
  
  showInvalidFilesWarning(invalidFiles) {
    const messages = invalidFiles.map(({ file, reason }) => 
      `${file.name}: ${reason}`
    );
    this.showToast(messages.join('\n'), 'warning');
  }
  
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} visible`;
    
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }
}

// Add processing state styles
const style = document.createElement('style');
style.textContent = `
  .empty-state.processing {
    pointer-events: none;
    opacity: 0.6;
  }
  
  .empty-state.processing::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    border: 4px solid var(--surface-200, rgba(255,255,255,0.2));
    border-top-color: var(--brand-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
  
  .toast.success {
    background: color-mix(in srgb, var(--success, #10b981) 90%, #000);
    border-color: var(--success, #10b981);
  }
  
  .toast.error {
    background: color-mix(in srgb, var(--error, #ef4444) 90%, #000);
    border-color: var(--error, #ef4444);
  }
  
  .toast.warning {
    background: color-mix(in srgb, var(--warning, #f59e0b) 90%, #000);
    border-color: var(--warning, #f59e0b);
  }
`;
document.head.appendChild(style);

// Initialize optimized playback
if (typeof window !== 'undefined') {
  window.optimizedPlayback = new OptimizedPlayback();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptimizedPlayback;
}
