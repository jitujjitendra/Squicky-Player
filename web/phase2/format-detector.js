/**
 * Advanced Format Detection & Compatibility Module
 * Detects media formats, codecs, and provides compatibility info
 */

class FormatDetector {
  constructor() {
    this.supportMatrix = this.buildSupportMatrix();
    this.qualityLevels = this.defineQualityLevels();
  }

  /**
   * Build comprehensive codec and format support matrix
   */
  buildSupportMatrix() {
    const video = document.createElement('video');
    const audio = document.createElement('audio');

    return {
      // Video Containers
      containers: {
        mp4: {
          test: () => video.canPlayType('video/mp4') !== '',
          codecs: ['h264', 'h265', 'avc1', 'hevc'],
          label: 'MP4',
          priority: 1,
          icon: '🎬'
        },
        webm: {
          test: () => video.canPlayType('video/webm') !== '',
          codecs: ['vp8', 'vp9', 'av1'],
          label: 'WebM',
          priority: 2,
          icon: '🎬'
        },
        ogg: {
          test: () => video.canPlayType('video/ogg') !== '',
          codecs: ['theora'],
          label: 'OGG',
          priority: 3,
          icon: '🎬'
        },
        mkv: {
          test: () => false, // Requires compatible codecs
          codecs: ['h264', 'h265', 'vp8', 'vp9'],
          label: 'MKV',
          priority: 4,
          icon: '📦',
          warning: 'MKV support depends on embedded codecs. H.264/AAC works best.'
        },
        avi: {
          test: () => false,
          codecs: ['xvid', 'divx', 'h264'],
          label: 'AVI',
          priority: 5,
          icon: '📦',
          warning: 'Limited browser support. Re-encode to MP4 for best compatibility.'
        },
        mov: {
          test: () => video.canPlayType('video/quicktime') !== '',
          codecs: ['h264', 'prores'],
          label: 'MOV',
          priority: 4,
          icon: '🎥',
          warning: 'QuickTime format. H.264 codec works on most browsers.'
        },
        flv: {
          test: () => false,
          codecs: ['h263', 'vp6'],
          label: 'FLV',
          priority: 6,
          icon: '⚠️',
          warning: 'Flash Video is not supported. Please convert to MP4.'
        },
        '3gp': {
          test: () => video.canPlayType('video/3gpp') !== '',
          codecs: ['h263', 'h264'],
          label: '3GP',
          priority: 5,
          icon: '📱'
        }
      },

      // Video Codecs
      videoCodecs: {
        h264: {
          test: () => video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
          label: 'H.264 (AVC)',
          priority: 1,
          quality: 'excellent',
          icon: '✅'
        },
        h265: {
          test: () => video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== '',
          label: 'H.265 (HEVC)',
          priority: 2,
          quality: 'excellent',
          icon: '✅',
          note: 'Better compression than H.264'
        },
        vp8: {
          test: () => video.canPlayType('video/webm; codecs="vp8"') !== '',
          label: 'VP8',
          priority: 3,
          quality: 'good',
          icon: '✅'
        },
        vp9: {
          test: () => video.canPlayType('video/webm; codecs="vp9"') !== '',
          label: 'VP9',
          priority: 2,
          quality: 'excellent',
          icon: '✅',
          note: 'High quality, efficient'
        },
        av1: {
          test: () => video.canPlayType('video/webm; codecs="av01.0.05M.08"') !== '',
          label: 'AV1',
          priority: 1,
          quality: 'excellent',
          icon: '🌟',
          note: 'Next-gen codec, best compression'
        },
        theora: {
          test: () => video.canPlayType('video/ogg; codecs="theora"') !== '',
          label: 'Theora',
          priority: 4,
          quality: 'fair',
          icon: '⚠️'
        }
      },

      // Audio Codecs
      audioCodecs: {
        aac: {
          test: () => audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '',
          label: 'AAC',
          priority: 1,
          quality: 'excellent',
          icon: '🔊'
        },
        mp3: {
          test: () => audio.canPlayType('audio/mpeg') !== '',
          label: 'MP3',
          priority: 2,
          quality: 'good',
          icon: '🔊'
        },
        opus: {
          test: () => audio.canPlayType('audio/ogg; codecs="opus"') !== '',
          label: 'Opus',
          priority: 1,
          quality: 'excellent',
          icon: '🔊',
          note: 'Best quality at low bitrates'
        },
        vorbis: {
          test: () => audio.canPlayType('audio/ogg; codecs="vorbis"') !== '',
          label: 'Vorbis',
          priority: 3,
          quality: 'good',
          icon: '🔊'
        },
        flac: {
          test: () => audio.canPlayType('audio/flac') !== '',
          label: 'FLAC',
          priority: 1,
          quality: 'lossless',
          icon: '💎',
          note: 'Lossless audio'
        },
        wav: {
          test: () => audio.canPlayType('audio/wav') !== '',
          label: 'WAV',
          priority: 2,
          quality: 'lossless',
          icon: '💎'
        },
        ac3: {
          test: () => false,
          label: 'AC-3',
          priority: 5,
          quality: 'good',
          icon: '⚠️',
          warning: 'Not supported in browsers. Use AAC instead.'
        },
        dts: {
          test: () => false,
          label: 'DTS',
          priority: 5,
          quality: 'good',
          icon: '⚠️',
          warning: 'Not supported in browsers. Use AAC instead.'
        }
      },

      // Streaming Formats
      streaming: {
        hls: {
          test: () => {
            const native = video.canPlayType('application/vnd.apple.mpegurl') !== '';
            const jsSupported = typeof window.Hls !== 'undefined';
            return native || jsSupported;
          },
          label: 'HLS (M3U8)',
          priority: 1,
          icon: '📡',
          note: 'Adaptive streaming'
        },
        dash: {
          test: () => typeof window.dashjs !== 'undefined' || 'MediaSource' in window,
          label: 'DASH (MPD)',
          priority: 1,
          icon: '📡',
          note: 'Adaptive streaming'
        }
      }
    };
  }

  /**
   * Define quality levels (144p to 2160p)
   */
  defineQualityLevels() {
    return [
      { height: 144, label: '144p', badge: 'SD', bitrate: 250, tier: 'low' },
      { height: 240, label: '240p', badge: 'SD', bitrate: 500, tier: 'low' },
      { height: 360, label: '360p', badge: 'SD', bitrate: 800, tier: 'medium' },
      { height: 480, label: '480p', badge: 'SD', bitrate: 1200, tier: 'medium' },
      { height: 720, label: '720p', badge: 'HD', bitrate: 2500, tier: 'high' },
      { height: 1080, label: '1080p', badge: 'Full HD', bitrate: 5000, tier: 'high' },
      { height: 1440, label: '1440p', badge: '2K', bitrate: 9000, tier: 'ultra' },
      { height: 2160, label: '2160p', badge: '4K', bitrate: 16000, tier: 'ultra' }
    ];
  }

  /**
   * Detect file format from filename/URL
   */
  detectFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const extMap = {
      mp4: 'mp4',
      m4v: 'mp4',
      webm: 'webm',
      ogv: 'ogg',
      ogg: 'ogg',
      mkv: 'mkv',
      avi: 'avi',
      mov: 'mov',
      qt: 'mov',
      flv: 'flv',
      '3gp': '3gp',
      '3gpp': '3gp',
      mp3: 'mp3',
      m4a: 'aac',
      aac: 'aac',
      opus: 'opus',
      oga: 'vorbis',
      flac: 'flac',
      wav: 'wav',
      m3u8: 'hls',
      mpd: 'dash'
    };
    return extMap[ext] || 'unknown';
  }

  /**
   * Get format compatibility info
   */
  getFormatInfo(filename) {
    const format = this.detectFormat(filename);
    let containerInfo = this.supportMatrix.containers[format];
    let audioCodecInfo = this.supportMatrix.audioCodecs[format];
    let streamingInfo = this.supportMatrix.streaming[format];

    if (containerInfo) {
      const isSupported = containerInfo.test();
      return {
        format,
        type: 'video',
        label: containerInfo.label,
        icon: containerInfo.icon,
        supported: isSupported,
        status: isSupported ? 'compatible' : 'incompatible',
        warning: containerInfo.warning,
        codecs: containerInfo.codecs,
        recommendation: isSupported 
          ? 'Ready to play' 
          : this.getRecommendation(format)
      };
    }

    if (audioCodecInfo) {
      const isSupported = audioCodecInfo.test();
      return {
        format,
        type: 'audio',
        label: audioCodecInfo.label,
        icon: audioCodecInfo.icon,
        supported: isSupported,
        status: isSupported ? 'compatible' : 'incompatible',
        quality: audioCodecInfo.quality,
        note: audioCodecInfo.note,
        recommendation: isSupported 
          ? 'Ready to play' 
          : 'Convert to MP3 or AAC'
      };
    }

    if (streamingInfo) {
      const isSupported = streamingInfo.test();
      return {
        format,
        type: 'streaming',
        label: streamingInfo.label,
        icon: streamingInfo.icon,
        supported: isSupported,
        status: isSupported ? 'compatible' : 'incompatible',
        note: streamingInfo.note,
        recommendation: isSupported 
          ? 'Adaptive streaming ready' 
          : 'Streaming not supported'
      };
    }

    return {
      format,
      type: 'unknown',
      label: format.toUpperCase(),
      icon: '❓',
      supported: false,
      status: 'unknown',
      recommendation: 'Format not recognized. Try MP4 or WebM.'
    };
  }

  /**
   * Get conversion recommendation
   */
  getRecommendation(format) {
    const recommendations = {
      mkv: 'Use MKV with H.264/AAC codecs, or convert to MP4',
      avi: 'Convert to MP4 with H.264/AAC for best compatibility',
      mov: 'Use H.264 codec, or convert to MP4',
      flv: 'Convert to MP4 - Flash Video is obsolete',
      '3gp': 'Convert to MP4 for better quality and compatibility'
    };
    return recommendations[format] || 'Convert to MP4 (H.264/AAC) or WebM (VP9/Opus)';
  }

  /**
   * Extract media metadata (requires File API)
   */
  async extractMediaInfo(file) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const info = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: video.videoWidth / video.videoHeight,
          quality: this.estimateQuality(video.videoHeight),
          fileSize: file.size,
          fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
          filename: file.name,
          mimeType: file.type
        };

        URL.revokeObjectURL(video.src);
        resolve(info);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          error: 'Unable to read media metadata',
          filename: file.name,
          fileSize: file.size,
          fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
          mimeType: file.type
        });
      };

      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Estimate quality level based on resolution
   */
  estimateQuality(height) {
    const level = this.qualityLevels.find(q => height <= q.height * 1.1);
    return level || this.qualityLevels[this.qualityLevels.length - 1];
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats() {
    const supported = {
      video: [],
      audio: [],
      streaming: []
    };

    Object.entries(this.supportMatrix.containers).forEach(([key, info]) => {
      if (info.test()) {
        supported.video.push({ format: key, ...info });
      }
    });

    Object.entries(this.supportMatrix.audioCodecs).forEach(([key, info]) => {
      if (info.test()) {
        supported.audio.push({ format: key, ...info });
      }
    });

    Object.entries(this.supportMatrix.streaming).forEach(([key, info]) => {
      if (info.test()) {
        supported.streaming.push({ format: key, ...info });
      }
    });

    return supported;
  }

  /**
   * Generate capability report
   */
  generateCapabilityReport() {
    const supported = this.getSupportedFormats();
    const total = {
      video: Object.keys(this.supportMatrix.containers).length,
      audio: Object.keys(this.supportMatrix.audioCodecs).length,
      streaming: Object.keys(this.supportMatrix.streaming).length
    };

    return {
      supported,
      total,
      coverage: {
        video: `${supported.video.length}/${total.video}`,
        audio: `${supported.audio.length}/${total.audio}`,
        streaming: `${supported.streaming.length}/${total.streaming}`
      },
      browser: this.getBrowserInfo(),
      device: this.getDeviceInfo()
    };
  }

  /**
   * Get browser info
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';

    return {
      name: browser,
      userAgent: ua,
      platform: navigator.platform
    };
  }

  /**
   * Get device info
   */
  getDeviceInfo() {
    return {
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      isTablet: /iPad|Android/i.test(navigator.userAgent) && window.innerWidth > 768,
      isDesktop: !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1
    };
  }
}

// Export for use in other modules
window.FormatDetector = FormatDetector;
