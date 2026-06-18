/**
 * SQUICKY PLAYER - ENHANCED CONTROLS
 * Speed control, quality selector, improved volume and timeline
 */

class EnhancedControls {
  constructor() {
    this.speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    this.currentSpeed = 1;
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
    this.enhanceSpeedControl();
    this.enhanceQualitySelector();
    this.enhanceVolumeControl();
    this.enhanceTimeline();
    this.addKeyboardShortcuts();
  }
  
  /**
   * Enhanced Speed Control
   */
  enhanceSpeedControl() {
    // Find all video/audio elements
    const mediaElements = document.querySelectorAll('video, audio');
    
    // Check if player has speed control already
    const existingSpeedControl = document.querySelector('[data-speed-control]');
    if (existingSpeedControl) {
      this.upgradeExistingSpeedControl(existingSpeedControl);
      return;
    }
    
    // Add speed control functionality to media elements
    mediaElements.forEach(media => {
      this.attachSpeedControl(media);
    });
  }
  
  attachSpeedControl(media) {
    // Load saved speed preference
    const savedSpeed = localStorage.getItem('squicky-playback-speed');
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      if (this.speedOptions.includes(speed)) {
        media.playbackRate = speed;
        this.currentSpeed = speed;
      }
    }
    
    // Listen for speed changes
    media.addEventListener('ratechange', () => {
      this.currentSpeed = media.playbackRate;
      this.updateSpeedDisplay();
    });
  }
  
  setSpeed(speed) {
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach(media => {
      media.playbackRate = speed;
    });
    
    // Save preference
    localStorage.setItem('squicky-playback-speed', speed.toString());
    this.currentSpeed = speed;
    this.updateSpeedDisplay();
  }
  
  updateSpeedDisplay() {
    const speedDisplays = document.querySelectorAll('[data-speed-display]');
    speedDisplays.forEach(display => {
      display.textContent = `${this.currentSpeed}x`;
    });
  }
  
  /**
   * Enhanced Quality Selector
   */
  enhanceQualitySelector() {
    // Quality selection is handled by the player SDK
    // We enhance the UI for better visibility
    
    // Add quality badges to make it more obvious
    const qualityButtons = document.querySelectorAll('[data-quality-button]');
    qualityButtons.forEach(button => {
      this.addQualityBadge(button);
    });
  }
  
  addQualityBadge(button) {
    const currentQuality = button.textContent.trim();
    if (currentQuality && !button.querySelector('.quality-badge')) {
      const badge = document.createElement('span');
      badge.className = 'quality-badge';
      badge.textContent = currentQuality;
      button.appendChild(badge);
    }
  }
  
  /**
   * Enhanced Volume Control
   */
  enhanceVolumeControl() {
    const mediaElements = document.querySelectorAll('video, audio');
    
    // Load saved volume preference
    const savedVolume = localStorage.getItem('squicky-volume');
    const savedMuted = localStorage.getItem('squicky-muted') === 'true';
    
    mediaElements.forEach(media => {
      if (savedVolume !== null) {
        media.volume = parseFloat(savedVolume);
      }
      if (savedMuted) {
        media.muted = true;
      }
      
      // Save volume changes
      media.addEventListener('volumechange', () => {
        localStorage.setItem('squicky-volume', media.volume.toString());
        localStorage.setItem('squicky-muted', media.muted.toString());
      });
    });
  }
  
  /**
   * Enhanced Timeline with Chapter Markers
   */
  enhanceTimeline() {
    // Timeline enhancements are mostly CSS-based
    // This adds smooth seeking feedback
    
    const timelineElements = document.querySelectorAll('[data-timeline]');
    timelineElements.forEach(timeline => {
      this.addTimelineFeedback(timeline);
    });
  }
  
  addTimelineFeedback(timeline) {
    let isSeeking = false;
    
    timeline.addEventListener('mousedown', () => {
      isSeeking = true;
      timeline.classList.add('seeking');
    });
    
    document.addEventListener('mouseup', () => {
      if (isSeeking) {
        isSeeking = false;
        timeline.classList.remove('seeking');
      }
    });
    
    timeline.addEventListener('mousemove', (e) => {
      if (!isSeeking) return;
      
      // Update preview position
      this.updateTimelinePreview(timeline, e);
    });
  }
  
  updateTimelinePreview(timeline, event) {
    const rect = timeline.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    
    const preview = timeline.querySelector('.timeline-preview');
    if (preview) {
      preview.style.left = `${percent * 100}%`;
      
      // Update preview time
      const mediaElements = document.querySelectorAll('video, audio');
      if (mediaElements.length > 0) {
        const media = mediaElements[0];
        const time = media.duration * percent;
        const timeDisplay = preview.querySelector('.timeline-preview-time');
        if (timeDisplay) {
          timeDisplay.textContent = this.formatTime(time);
        }
      }
    }
  }
  
  /**
   * Keyboard Shortcuts
   */
  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input/dialog
      if (e.target.matches('input, textarea, select, [contenteditable]')) return;
      if (e.target.closest('dialog[open]')) return;
      
      // Find media element - check Shadow DOM first
      let media = null;
      const player = document.querySelector('squicky-player#player');
      if (player && player.shadowRoot) {
        media = player.shadowRoot.querySelector('video') || player.shadowRoot.querySelector('audio');
      }
      if (!media) {
        media = document.querySelector('video') || document.querySelector('audio');
      }
      
      // No media found at all
      if (!media) return;
      
      // Check if media has valid source
      if (!media.src && !media.currentSrc && media.readyState === 0) return;
      
      const key = e.key;
      
      switch(key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          media.paused ? media.play() : media.pause();
          this.showFeedback(media.paused ? '⏸ Paused' : '▶ Playing');
          break;
          
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          media.currentTime = Math.max(0, media.currentTime - 10);
          this.showSeekFeedback(-10);
          break;
          
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
          this.showSeekFeedback(+10);
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          media.volume = Math.min(1, (media.volume + 0.05).toFixed(2));
          if (media.muted) media.muted = false;
          this.showVolumeFeedback(media);
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          media.volume = Math.max(0, (media.volume - 0.05).toFixed(2));
          this.showVolumeFeedback(media);
          break;
          
        case 'm':
        case 'M':
          e.preventDefault();
          media.muted = !media.muted;
          this.showMuteFeedback(media.muted);
          break;
          
        case 'f':
        case 'F':
          e.preventDefault();
          this.toggleFullscreen();
          break;
          
        case ',':
          e.preventDefault();
          if (media.paused) {
            media.currentTime = Math.max(0, media.currentTime - 1/30); // Previous frame
            this.showFeedback('⏪ Previous frame');
          }
          break;
          
        case '.':
          e.preventDefault();
          if (media.paused) {
            media.currentTime = Math.min(media.duration || 0, media.currentTime + 1/30); // Next frame
            this.showFeedback('⏩ Next frame');
          }
          break;
          
        case '<':
          e.preventDefault();
          this.decreaseSpeed();
          break;
          
        case '>':
          e.preventDefault();
          this.increaseSpeed();
          break;
          
        case 'Home':
          e.preventDefault();
          media.currentTime = 0;
          this.showFeedback('⏮ Start');
          break;
          
        case 'End':
          e.preventDefault();
          if (media.duration) media.currentTime = media.duration;
          this.showFeedback('⏭ End');
          break;
      }
      
      // Number keys for seeking (0-9 = 0%-90%)
      if (key >= '0' && key <= '9' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const percent = parseInt(key) / 10;
        if (media.duration) {
          media.currentTime = media.duration * percent;
          this.showSeekFeedback(null, percent);
        }
      }
    });
  }
  
  decreaseSpeed() {
    const currentIndex = this.speedOptions.indexOf(this.currentSpeed);
    if (currentIndex > 0) {
      this.setSpeed(this.speedOptions[currentIndex - 1]);
      this.showSpeedFeedback();
    }
  }
  
  increaseSpeed() {
    const currentIndex = this.speedOptions.indexOf(this.currentSpeed);
    if (currentIndex < this.speedOptions.length - 1) {
      this.setSpeed(this.speedOptions[currentIndex + 1]);
      this.showSpeedFeedback();
    }
  }
  
  toggleFullscreen() {
    const player = document.querySelector('squicky-player') || document.documentElement;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      player.requestFullscreen();
    }
  }
  
  /**
   * Visual Feedback
   */
  showSeekFeedback(seconds, percent = null) {
    this.showFeedback(
      percent !== null 
        ? `${Math.round(percent * 100)}%` 
        : `${seconds > 0 ? '+' : ''}${seconds}s`
    );
  }
  
  showVolumeFeedback(media) {
    if (!media) {
      const player = document.querySelector('squicky-player#player');
      if (player && player.shadowRoot) {
        media = player.shadowRoot.querySelector('video') || player.shadowRoot.querySelector('audio');
      }
      if (!media) media = document.querySelector('video') || document.querySelector('audio');
    }
    if (media) {
      const volume = Math.round(media.volume * 100);
      const icon = volume === 0 ? '🔇' : volume < 33 ? '🔈' : volume < 66 ? '🔉' : '🔊';
      this.showFeedback(`${icon} Volume: ${volume}%`);
    }
  }
  
  showMuteFeedback(muted) {
    this.showFeedback(muted ? 'Muted' : 'Unmuted');
  }
  
  showSpeedFeedback() {
    this.showFeedback(`Speed: ${this.currentSpeed}x`);
  }
  
  showFeedback(message) {
    // Remove existing feedback
    const existing = document.querySelector('.control-feedback');
    if (existing) existing.remove();
    
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = 'control-feedback';
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 700;
      z-index: 10000;
      pointer-events: none;
      backdrop-filter: blur(10px);
      animation: feedbackFade 0.8s ease;
    `;
    
    document.body.appendChild(feedback);
    
    // Auto remove
    setTimeout(() => feedback.remove(), 800);
  }
  
  /**
   * Utility Functions
   */
  formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
}

// Add CSS animation for feedback
const style = document.createElement('style');
style.textContent = `
  @keyframes feedbackFade {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  }
`;
document.head.appendChild(style);

// Initialize enhanced controls
if (typeof window !== 'undefined') {
  window.enhancedControls = new EnhancedControls();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedControls;
}
