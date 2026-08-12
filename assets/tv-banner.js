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
    this.hamburger = document.querySelector('.tv-banner__topbar');
    
    this.isOpen = false;
    
    this.init();
  }

  init() {
    // Hamburger click - toggle drawer
    if (this.hamburger) {
      this.hamburger.addEventListener('click', (e) => {
        // Only trigger if clicking on ::before pseudo-element area (left side)
        const rect = this.hamburger.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        // If click is within first 80px (hamburger area), toggle drawer
        if (clickX < 80) {
          this.toggle();
        }
      });
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

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.drawer.classList.add('tv-drawer--open');
    this.hamburger.classList.add('tv-menu-open'); // toggle hamburger icon
    this.isOpen = true;
    
    // Prevent body scroll when drawer open
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.drawer.classList.remove('tv-drawer--open');
    this.hamburger.classList.remove('tv-menu-open'); // toggle back to hamburger
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
