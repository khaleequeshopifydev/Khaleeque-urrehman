/**
 * tv-banner.js
 * ─────────────────────────────────────────────────────────────
 * Tisso Vison — Banner Section JavaScript
 * Handles mobile drawer open/close functionality
 * ─────────────────────────────────────────────────────────────
 */

class TvMobileDrawer {
  constructor() {
    this.drawer = document.getElementById('tv-mobile-drawer');
    if (!this.drawer) return;

    this.panel = this.drawer.querySelector('.tv-drawer__panel');
    this.overlay = this.drawer.querySelector('.tv-drawer__overlay');
    this.closeBtn = this.drawer.querySelector('.tv-drawer__close');
    this.hamburger = document.querySelector('.tv-banner__topbar');
    
    this.isOpen = false;
    
    this.init();
  }

  init() {
    // Hamburger click - open drawer
    if (this.hamburger) {
      this.hamburger.addEventListener('click', (e) => {
        // Only trigger if clicking on ::before pseudo-element area (left side)
        const rect = this.hamburger.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        // If click is within first 80px (hamburger area), open drawer
        if (clickX < 80) {
          this.open();
        }
      });
    }

    // Close button click
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // Overlay click - close drawer
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    // ESC key - close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open() {
    this.drawer.classList.add('tv-drawer--open');
    this.isOpen = true;
    
    // Prevent body scroll when drawer open
    document.body.style.overflow = 'hidden';
    
    // Focus on close button for accessibility
    setTimeout(() => {
      if (this.closeBtn) {
        this.closeBtn.focus();
      }
    }, 300); // after transition
  }

  close() {
    this.drawer.classList.remove('tv-drawer--open');
    this.isOpen = false;
    
    // Restore body scroll
    document.body.style.overflow = '';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TvMobileDrawer();
  });
} else {
  new TvMobileDrawer();
}
