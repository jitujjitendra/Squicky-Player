/**
 * SQUICKY PLAYER - THEME SWITCHER
 * Handles theme and mode switching with localStorage persistence
 */

class ThemeSwitcher {
  constructor() {
    this.themes = ['original', 'minimal', 'modern', 'professional'];
    this.modes = ['dark', 'light'];
    
    // Load saved preferences or use defaults
    this.currentTheme = localStorage.getItem('squicky-theme') || 'original';
    this.currentMode = localStorage.getItem('squicky-mode') || 'dark';
    
    this.init();
  }
  
  init() {
    // Apply saved theme immediately
    this.applyTheme(this.currentTheme, this.currentMode);
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }
  
  setupUI() {
    // Create theme controls in header
    this.createThemeControls();
    
    // Bind events
    this.bindEvents();
  }
  
  createThemeControls() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    
    // Create theme controls container
    const themeControls = document.createElement('div');
    themeControls.className = 'theme-controls';
    themeControls.innerHTML = `
      <button class="mode-toggle" id="modeToggle" title="Toggle Dark/Light Mode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
        </svg>
        <span id="modeLabel">${this.currentMode === 'dark' ? 'Dark' : 'Light'}</span>
      </button>
      
      <div class="theme-switcher" id="themeSwitcher">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
        </svg>
        <span id="themeLabel">${this.getThemeDisplayName(this.currentTheme)}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px">
          <path d="M6 9l6 6 6-6"></path>
        </svg>
        
        <div class="theme-dropdown" id="themeDropdown">
          ${this.themes.map(theme => `
            <div class="theme-option ${theme === this.currentTheme ? 'active' : ''}" data-theme="${theme}">
              <div class="theme-option-icon"></div>
              <span>${this.getThemeDisplayName(theme)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // Insert before existing items
    headerActions.insertBefore(themeControls, headerActions.firstChild);
  }
  
  bindEvents() {
    // Mode toggle
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => this.toggleMode());
    }
    
    // Theme switcher dropdown
    const themeSwitcher = document.getElementById('themeSwitcher');
    const themeDropdown = document.getElementById('themeDropdown');
    
    if (themeSwitcher && themeDropdown) {
      themeSwitcher.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('open');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        themeDropdown.classList.remove('open');
      });
      
      // Theme options
      const themeOptions = themeDropdown.querySelectorAll('.theme-option');
      themeOptions.forEach(option => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          const theme = option.dataset.theme;
          this.setTheme(theme);
          themeDropdown.classList.remove('open');
        });
      });
    }
  }
  
  toggleMode() {
    const newMode = this.currentMode === 'dark' ? 'light' : 'dark';
    this.currentMode = newMode;
    
    // Save to localStorage
    localStorage.setItem('squicky-mode', newMode);
    
    // Apply theme
    this.applyTheme(this.currentTheme, newMode);
    
    // Update UI
    const modeLabel = document.getElementById('modeLabel');
    if (modeLabel) {
      modeLabel.textContent = newMode === 'dark' ? 'Dark' : 'Light';
    }
    
    // Update meta theme-color
    this.updateMetaTheme();
  }
  
  setTheme(theme) {
    if (!this.themes.includes(theme)) return;
    
    this.currentTheme = theme;
    
    // Save to localStorage
    localStorage.setItem('squicky-theme', theme);
    
    // Apply theme
    this.applyTheme(theme, this.currentMode);
    
    // Update UI
    const themeLabel = document.getElementById('themeLabel');
    if (themeLabel) {
      themeLabel.textContent = this.getThemeDisplayName(theme);
    }
    
    // Update active state in dropdown
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      if (option.dataset.theme === theme) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
    
    // Update meta theme-color
    this.updateMetaTheme();
  }
  
  applyTheme(theme, mode) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
    
    // Also update body for legacy support
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-mode', mode);
  }
  
  updateMetaTheme() {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    
    // Theme colors based on current theme and mode
    const themeColors = {
      original: { dark: '#070708', light: '#ffffff' },
      minimal: { dark: '#000000', light: '#ffffff' },
      modern: { dark: '#0f0517', light: '#faf5ff' },
      professional: { dark: '#0f172a', light: '#f8fafc' }
    };
    
    const color = themeColors[this.currentTheme]?.[this.currentMode] || '#070708';
    
    if (metaTheme) {
      metaTheme.setAttribute('content', color);
    }
    
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', this.currentMode);
    }
  }
  
  getThemeDisplayName(theme) {
    const names = {
      original: 'Original',
      minimal: 'Minimal',
      modern: 'Modern',
      professional: 'Professional'
    };
    return names[theme] || theme;
  }
}

// Initialize theme switcher
if (typeof window !== 'undefined') {
  window.themeSwitcher = new ThemeSwitcher();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeSwitcher;
}
