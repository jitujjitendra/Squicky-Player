/**
 * AnalyticsManager - Sprint 4: Analytics & Statistics Dashboard
 * Tracks playback statistics, format usage, quality changes, buffer events,
 * and session history. All data stored locally in localStorage (privacy-first).
 */
class AnalyticsManager {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.storageKey = options.storageKey || 'squicky-analytics';
    this.maxSessions = options.maxSessions || 50;
    this.maxQualityChanges = options.maxQualityChanges || 100;
    this.maxBufferEpisodes = options.maxBufferEpisodes || 5;

    this.currentSession = null;
    this.bufferStartTime = null;

    this._loadData();
    this._bindEvents();

    window.dispatchEvent(new CustomEvent('analytics:update', { detail: { type: 'init' } }));
  }

  // ─── Data Persistence ───────────────────────────────────────────────

  _getDefaultData() {
    return {
      playback: {
        totalPlayTime: 0,
        totalSessions: 0,
        peakUsageHours: new Array(24).fill(0)
      },
      formats: {},
      qualityChanges: [],
      buffer: {
        totalCount: 0,
        totalTime: 0,
        worstEpisodes: []
      },
      sessions: [],
      lastUpdated: null
    };
  }

  _loadData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.data = JSON.parse(stored);
        // Ensure all fields exist (migrate older data)
        const defaults = this._getDefaultData();
        this.data.playback = { ...defaults.playback, ...this.data.playback };
        this.data.buffer = { ...defaults.buffer, ...this.data.buffer };
        if (!this.data.formats) this.data.formats = {};
        if (!this.data.qualityChanges) this.data.qualityChanges = [];
        if (!this.data.sessions) this.data.sessions = [];
        if (!this.data.playback.peakUsageHours) {
          this.data.playback.peakUsageHours = new Array(24).fill(0);
        }
      } else {
        this.data = this._getDefaultData();
      }
    } catch (e) {
      console.warn('[AnalyticsManager] Failed to load data, resetting:', e);
      this.data = this._getDefaultData();
    }
  }

  _saveData() {
    try {
      this.data.lastUpdated = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[AnalyticsManager] Failed to save data:', e);
    }
  }

  // ─── Event Binding ──────────────────────────────────────────────────

  _bindEvents() {
    // Playback events
    window.addEventListener('squicky:play', (e) => this._onPlay(e));
    window.addEventListener('squicky:pause', (e) => this._onPause(e));
    window.addEventListener('squicky:ended', (e) => this._onEnded(e));
    window.addEventListener('squicky:timeupdate', (e) => this._onTimeUpdate(e));

    // Quality events
    window.addEventListener('quality:changed', (e) => this._onQualityChange(e));
    window.addEventListener('squicky:qualitychange', (e) => this._onQualityChange(e));

    // Buffer events
    window.addEventListener('squicky:buffering', (e) => this._onBufferStart(e));
    window.addEventListener('squicky:bufferend', (e) => this._onBufferEnd(e));
    window.addEventListener('squicky:waiting', (e) => this._onBufferStart(e));
    window.addEventListener('squicky:playing', (e) => this._onBufferEnd(e));

    // Format/source events
    window.addEventListener('squicky:sourcechange', (e) => this._onSourceChange(e));
    window.addEventListener('format:detected', (e) => this._onFormatDetected(e));

    // Page unload
    window.addEventListener('beforeunload', () => this._endCurrentSession('unload'));
  }

  // ─── Session Management ─────────────────────────────────────────────

  _startSession(detail = {}) {
    if (!this.enabled) return;
    if (this.currentSession) return;

    const now = Date.now();
    const hour = new Date(now).getHours();

    this.currentSession = {
      id: this._generateId(),
      startTime: now,
      endTime: null,
      duration: 0,
      mediaTitle: detail.title || detail.mediaTitle || 'Unknown',
      mediaFormat: detail.format || detail.mediaFormat || 'unknown',
      mediaCodec: detail.codec || null,
      mediaSize: detail.size || null,
      qualityUsed: [],
      bufferEvents: 0,
      playTimeAccumulated: 0
    };

    // Track peak usage hour
    this.data.playback.peakUsageHours[hour]++;

    this.data.playback.totalSessions++;
    this._saveData();

    window.dispatchEvent(new CustomEvent('analytics:session', {
      detail: { type: 'start', session: this.currentSession }
    }));
  }

  _endCurrentSession(reason = 'pause') {
    if (!this.currentSession) return;

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.duration = (now - this.currentSession.startTime) / 1000;

    // Add accumulated play time
    this.data.playback.totalPlayTime += this.currentSession.duration;

    // Store session in history
    const sessionRecord = { ...this.currentSession };
    this.data.sessions.unshift(sessionRecord);
    if (this.data.sessions.length > this.maxSessions) {
      this.data.sessions = this.data.sessions.slice(0, this.maxSessions);
    }

    this._saveData();

    window.dispatchEvent(new CustomEvent('analytics:session', {
      detail: { type: 'end', session: sessionRecord, reason }
    }));

    window.dispatchEvent(new CustomEvent('analytics:update', {
      detail: { type: 'session_end' }
    }));

    this.currentSession = null;
  }

  _generateId() {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  // ─── Event Handlers ─────────────────────────────────────────────────

  _onPlay(e) {
    if (!this.enabled) return;
    const detail = (e && e.detail) || {};
    if (!this.currentSession) {
      this._startSession(detail);
    }
  }

  _onPause(e) {
    if (!this.enabled) return;
    this._endCurrentSession('pause');
  }

  _onEnded(e) {
    if (!this.enabled) return;
    this._endCurrentSession('ended');
  }

  _onTimeUpdate(e) {
    // Lightweight - just used for tracking
    if (!this.enabled || !this.currentSession) return;
  }

  _onQualityChange(e) {
    if (!this.enabled) return;
    const detail = (e && e.detail) || {};

    const entry = {
      timestamp: Date.now(),
      fromQuality: detail.fromQuality || detail.from || null,
      toQuality: detail.toQuality || detail.to || detail.quality || null,
      reason: detail.reason || detail.type || 'unknown',
      bandwidth: detail.bandwidth || null
    };

    this.data.qualityChanges.unshift(entry);
    if (this.data.qualityChanges.length > this.maxQualityChanges) {
      this.data.qualityChanges = this.data.qualityChanges.slice(0, this.maxQualityChanges);
    }

    if (this.currentSession && entry.toQuality) {
      if (!this.currentSession.qualityUsed.includes(entry.toQuality)) {
        this.currentSession.qualityUsed.push(entry.toQuality);
      }
    }

    this._saveData();
    window.dispatchEvent(new CustomEvent('analytics:update', {
      detail: { type: 'quality_change', entry }
    }));
  }

  _onBufferStart(e) {
    if (!this.enabled) return;
    if (this.bufferStartTime) return; // Already buffering
    this.bufferStartTime = Date.now();
  }

  _onBufferEnd(e) {
    if (!this.enabled) return;
    if (!this.bufferStartTime) return;

    const bufferDuration = (Date.now() - this.bufferStartTime) / 1000;
    this.bufferStartTime = null;

    // Ignore very short buffer events (< 100ms)
    if (bufferDuration < 0.1) return;

    this.data.buffer.totalCount++;
    this.data.buffer.totalTime += bufferDuration;

    // Track worst episodes
    const episode = {
      timestamp: Date.now(),
      duration: bufferDuration,
      sessionId: this.currentSession ? this.currentSession.id : null
    };

    this.data.buffer.worstEpisodes.push(episode);
    this.data.buffer.worstEpisodes.sort((a, b) => b.duration - a.duration);
    if (this.data.buffer.worstEpisodes.length > this.maxBufferEpisodes) {
      this.data.buffer.worstEpisodes = this.data.buffer.worstEpisodes.slice(0, this.maxBufferEpisodes);
    }

    if (this.currentSession) {
      this.currentSession.bufferEvents++;
    }

    this._saveData();
    window.dispatchEvent(new CustomEvent('analytics:update', {
      detail: { type: 'buffer_event', duration: bufferDuration }
    }));
  }

  _onSourceChange(e) {
    if (!this.enabled) return;
    const detail = (e && e.detail) || {};
    this._trackFormat(detail);
  }

  _onFormatDetected(e) {
    if (!this.enabled) return;
    const detail = (e && e.detail) || {};
    this._trackFormat(detail);
  }

  _trackFormat(detail) {
    const format = (detail.format || detail.type || 'unknown').toUpperCase();
    const codec = detail.codec || detail.videoCodec || null;
    const size = detail.size || detail.fileSize || null;

    if (!this.data.formats[format]) {
      this.data.formats[format] = {
        count: 0,
        codecs: {},
        totalSize: 0,
        sizeCount: 0
      };
    }

    this.data.formats[format].count++;

    if (codec) {
      if (!this.data.formats[format].codecs[codec]) {
        this.data.formats[format].codecs[codec] = 0;
      }
      this.data.formats[format].codecs[codec]++;
    }

    if (size && typeof size === 'number') {
      this.data.formats[format].totalSize += size;
      this.data.formats[format].sizeCount++;
    }

    // Update current session format
    if (this.currentSession) {
      this.currentSession.mediaFormat = format;
      if (codec) this.currentSession.mediaCodec = codec;
    }

    this._saveData();
    window.dispatchEvent(new CustomEvent('analytics:update', {
      detail: { type: 'format_tracked', format }
    }));
  }

  // ─── Dashboard Data Methods ─────────────────────────────────────────

  /**
   * Returns summary stats for dashboard overview cards
   */
  getOverviewStats() {
    const playback = this.data.playback;
    const avgSessionLength = playback.totalSessions > 0
      ? playback.totalPlayTime / playback.totalSessions
      : 0;

    const totalFormats = Object.keys(this.data.formats).length;
    const totalBuffers = this.data.buffer.totalCount;
    const avgBufferDuration = totalBuffers > 0
      ? this.data.buffer.totalTime / totalBuffers
      : 0;

    return {
      totalPlayTime: playback.totalPlayTime,
      totalPlayTimeFormatted: this._formatDuration(playback.totalPlayTime),
      totalSessions: playback.totalSessions,
      avgSessionLength: avgSessionLength,
      avgSessionLengthFormatted: this._formatDuration(avgSessionLength),
      totalFormats: totalFormats,
      totalBufferEvents: totalBuffers,
      totalBufferTime: this.data.buffer.totalTime,
      avgBufferDuration: avgBufferDuration,
      qualityChanges: this.data.qualityChanges.length,
      lastUpdated: this.data.lastUpdated
    };
  }

  /**
   * Returns format usage data suitable for chart rendering
   */
  getFormatChart() {
    const formats = this.data.formats;
    const entries = Object.entries(formats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        codecs: data.codecs,
        avgSize: data.sizeCount > 0 ? data.totalSize / data.sizeCount : 0
      }))
      .sort((a, b) => b.count - a.count);

    const maxCount = entries.length > 0 ? entries[0].count : 1;

    return entries.map(entry => ({
      ...entry,
      percentage: Math.round((entry.count / maxCount) * 100)
    }));
  }

  /**
   * Returns quality changes data for timeline chart
   */
  getQualityTimeline() {
    return this.data.qualityChanges.map(entry => ({
      ...entry,
      timestampFormatted: new Date(entry.timestamp).toLocaleString(),
      isAuto: entry.reason === 'auto' || entry.reason === 'adaptive'
    }));
  }

  /**
   * Returns buffer analysis data
   */
  getBufferStats() {
    const buffer = this.data.buffer;
    const avgDuration = buffer.totalCount > 0
      ? buffer.totalTime / buffer.totalCount
      : 0;

    const sessionsWithBuffers = this.data.sessions.filter(s => s.bufferEvents > 0).length;
    const buffersPerSession = this.data.playback.totalSessions > 0
      ? buffer.totalCount / this.data.playback.totalSessions
      : 0;

    return {
      totalCount: buffer.totalCount,
      totalTime: buffer.totalTime,
      totalTimeFormatted: this._formatDuration(buffer.totalTime),
      avgDuration: avgDuration,
      avgDurationFormatted: this._formatDuration(avgDuration),
      buffersPerSession: Math.round(buffersPerSession * 100) / 100,
      sessionsWithBuffers: sessionsWithBuffers,
      worstEpisodes: buffer.worstEpisodes.map(ep => ({
        ...ep,
        durationFormatted: this._formatDuration(ep.duration),
        timestampFormatted: new Date(ep.timestamp).toLocaleString()
      }))
    };
  }

  /**
   * Returns recent session history
   */
  getSessionHistory(limit = 50) {
    return this.data.sessions.slice(0, limit).map(session => ({
      ...session,
      startTimeFormatted: new Date(session.startTime).toLocaleString(),
      endTimeFormatted: session.endTime ? new Date(session.endTime).toLocaleString() : 'In Progress',
      durationFormatted: this._formatDuration(session.duration)
    }));
  }

  /**
   * Returns hourly usage breakdown (0-23)
   */
  getUsageByHour() {
    const hours = this.data.playback.peakUsageHours;
    const maxUsage = Math.max(...hours, 1);

    return hours.map((count, hour) => ({
      hour,
      label: this._formatHour(hour),
      count,
      percentage: Math.round((count / maxUsage) * 100)
    }));
  }

  /**
   * Returns most played formats ranked
   */
  getMostPlayedFormats() {
    return Object.entries(this.data.formats)
      .map(([name, data]) => ({ name, count: data.count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Returns most played files (from session history)
   */
  getMostPlayedFiles(limit = 10) {
    const fileCounts = {};
    this.data.sessions.forEach(session => {
      const key = session.mediaTitle || 'Unknown';
      if (!fileCounts[key]) {
        fileCounts[key] = { title: key, playCount: 0, totalDuration: 0, format: session.mediaFormat };
      }
      fileCounts[key].playCount++;
      fileCounts[key].totalDuration += session.duration || 0;
    });

    return Object.values(fileCounts)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);
  }

  /**
   * Returns codec usage breakdown across all formats
   */
  getCodecBreakdown() {
    const codecs = {};
    Object.values(this.data.formats).forEach(formatData => {
      Object.entries(formatData.codecs).forEach(([codec, count]) => {
        if (!codecs[codec]) codecs[codec] = 0;
        codecs[codec] += count;
      });
    });

    return Object.entries(codecs)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ─── Export Functionality ───────────────────────────────────────────

  /**
   * Export all analytics data as formatted JSON file download
   */
  exportJSON() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      overview: this.getOverviewStats(),
      formats: this.getFormatChart(),
      qualityChanges: this.getQualityTimeline(),
      bufferStats: this.getBufferStats(),
      sessions: this.getSessionHistory(),
      hourlyUsage: this.getUsageByHour(),
      mostPlayedFiles: this.getMostPlayedFiles(),
      codecBreakdown: this.getCodecBreakdown()
    };

    const json = JSON.stringify(exportData, null, 2);
    this._downloadFile(json, 'squicky-analytics.json', 'application/json');

    window.dispatchEvent(new CustomEvent('analytics:export', {
      detail: { type: 'json', size: json.length }
    }));

    return exportData;
  }

  /**
   * Export session history and stats as CSV file download
   */
  exportCSV() {
    const sessions = this.data.sessions;

    // CSV Header
    const headers = [
      'Session ID',
      'Start Time',
      'End Time',
      'Duration (s)',
      'Media Title',
      'Format',
      'Codec',
      'Quality Used',
      'Buffer Events'
    ];

    const rows = sessions.map(session => [
      session.id,
      new Date(session.startTime).toISOString(),
      session.endTime ? new Date(session.endTime).toISOString() : '',
      Math.round(session.duration * 100) / 100,
      this._escapeCSV(session.mediaTitle || ''),
      session.mediaFormat || '',
      session.mediaCodec || '',
      (session.qualityUsed || []).join('; '),
      session.bufferEvents || 0
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    this._downloadFile(csv, 'squicky-analytics.csv', 'text/csv');

    window.dispatchEvent(new CustomEvent('analytics:export', {
      detail: { type: 'csv', rows: rows.length }
    }));

    return csv;
  }

  /**
   * Generate human-readable text summary/report
   */
  generateReport() {
    const stats = this.getOverviewStats();
    const formats = this.getFormatChart();
    const bufferStats = this.getBufferStats();
    const hourly = this.getUsageByHour();
    const topFiles = this.getMostPlayedFiles(5);

    const peakHour = hourly.reduce((max, h) => h.count > max.count ? h : max, { count: 0, label: 'N/A' });

    let report = '';
    report += '=== Squicky Player Analytics Report ===\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;

    report += '--- Overview ---\n';
    report += `Total Play Time: ${stats.totalPlayTimeFormatted}\n`;
    report += `Total Sessions: ${stats.totalSessions}\n`;
    report += `Average Session Length: ${stats.avgSessionLengthFormatted}\n`;
    report += `Formats Used: ${stats.totalFormats}\n`;
    report += `Quality Changes: ${stats.qualityChanges}\n\n`;

    report += '--- Format Usage ---\n';
    if (formats.length > 0) {
      formats.forEach(f => {
        report += `  ${f.name}: ${f.count} plays (${f.percentage}%)\n`;
      });
    } else {
      report += '  No format data recorded yet.\n';
    }
    report += '\n';

    report += '--- Buffer Analysis ---\n';
    report += `Total Buffer Events: ${bufferStats.totalCount}\n`;
    report += `Total Buffer Time: ${bufferStats.totalTimeFormatted}\n`;
    report += `Average Buffer Duration: ${bufferStats.avgDurationFormatted}\n`;
    report += `Buffers Per Session: ${bufferStats.buffersPerSession}\n\n`;

    report += '--- Peak Usage ---\n';
    report += `Peak Hour: ${peakHour.label} (${peakHour.count} sessions)\n\n`;

    report += '--- Most Played Files ---\n';
    if (topFiles.length > 0) {
      topFiles.forEach((f, i) => {
        report += `  ${i + 1}. ${f.title} - ${f.playCount} plays (${f.format})\n`;
      });
    } else {
      report += '  No file data recorded yet.\n';
    }
    report += '\n';

    report += '--- Recent Sessions ---\n';
    const recentSessions = this.getSessionHistory(10);
    if (recentSessions.length > 0) {
      recentSessions.forEach(s => {
        report += `  ${s.startTimeFormatted} | ${s.durationFormatted} | ${s.mediaTitle} (${s.mediaFormat})\n`;
      });
    } else {
      report += '  No sessions recorded yet.\n';
    }
    report += '\n=== End of Report ===\n';

    this._downloadFile(report, 'squicky-analytics-report.txt', 'text/plain');

    window.dispatchEvent(new CustomEvent('analytics:export', {
      detail: { type: 'report', length: report.length }
    }));

    return report;
  }

  // ─── Management ─────────────────────────────────────────────────────

  /**
   * Clear all analytics data (with confirmation event)
   */
  reset() {
    this._endCurrentSession('reset');
    this.data = this._getDefaultData();
    this._saveData();

    window.dispatchEvent(new CustomEvent('analytics:update', {
      detail: { type: 'reset' }
    }));
  }

  /**
   * Toggle tracking on/off
   */
  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (!this.enabled && this.currentSession) {
      this._endCurrentSession('disabled');
    }

    window.dispatchEvent(new CustomEvent('analytics:update', {
      detail: { type: 'enabled_changed', enabled: this.enabled }
    }));
  }

  /**
   * Check if tracking is currently enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Manually record a playback session (for external integrations)
   */
  recordSession(sessionData) {
    if (!this.enabled) return;

    const session = {
      id: this._generateId(),
      startTime: sessionData.startTime || Date.now(),
      endTime: sessionData.endTime || Date.now(),
      duration: sessionData.duration || 0,
      mediaTitle: sessionData.mediaTitle || 'Unknown',
      mediaFormat: sessionData.mediaFormat || 'unknown',
      mediaCodec: sessionData.mediaCodec || null,
      qualityUsed: sessionData.qualityUsed || [],
      bufferEvents: sessionData.bufferEvents || 0
    };

    this.data.playback.totalSessions++;
    this.data.playback.totalPlayTime += session.duration;

    const hour = new Date(session.startTime).getHours();
    this.data.playback.peakUsageHours[hour]++;

    this.data.sessions.unshift(session);
    if (this.data.sessions.length > this.maxSessions) {
      this.data.sessions = this.data.sessions.slice(0, this.maxSessions);
    }

    this._saveData();

    window.dispatchEvent(new CustomEvent('analytics:session', {
      detail: { type: 'recorded', session }
    }));
  }

  // ─── Utility Methods ────────────────────────────────────────────────

  _formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0s';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  _formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  _escapeCSV(str) {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  _downloadFile(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('[AnalyticsManager] Download failed:', e);
    }
  }

  /**
   * Get raw analytics data (for advanced usage)
   */
  getRawData() {
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Import analytics data (for restoring backups)
   */
  importData(jsonData) {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (parsed && parsed.playback && parsed.sessions) {
        this.data = parsed;
        this._saveData();
        window.dispatchEvent(new CustomEvent('analytics:update', {
          detail: { type: 'imported' }
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[AnalyticsManager] Import failed:', e);
      return false;
    }
  }

  /**
   * Destroy the manager and clean up event listeners
   */
  destroy() {
    this._endCurrentSession('destroy');
  }
}

// Attach to window
window.AnalyticsManager = AnalyticsManager;
