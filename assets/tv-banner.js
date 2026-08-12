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
    // Hamburger/Close icon click - toggle drawer
    if (this.hamburger) {
      this.hamburger.addEventListener('click', (e) => {
        // Check if clicking on hamburger/close icon area (left side) or if on small screen
        const rect = this.hamburger.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        // Mobile: if click is within first 100px (hamburger/close area), toggle
        // Also check if target is the topbar itself (not logo or other elements)
        const isHamburgerArea = clickX < 100;
        const isTopbarClick = e.target === this.hamburger || e.target.closest('.tv-banner__topbar') === this.hamburger;
        
        if (isHamburgerArea && isTopbarClick) {
          e.preventDefault();
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
