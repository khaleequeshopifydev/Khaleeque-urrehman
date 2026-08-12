/**
 * tv-grid.js
 * ─────────────────────────────────────────────────────────────
 * Tisso Vison — Product Grid JavaScript
 * Handles popup modal, variant selection, and add to cart
 * ─────────────────────────────────────────────────────────────
 */

class TvProductPopup {
  constructor() {
    this.popup = document.getElementById('tv-product-popup');
    if (!this.popup) return;

    this.overlay = this.popup.querySelector('.tv-popup__overlay');
    this.modal = this.popup.querySelector('.tv-popup__modal');
    this.closeBtn = this.popup.querySelector('.tv-popup__close');
    this.addToCartBtn = this.popup.querySelector('.tv-popup__add-btn');
    
    this.currentProduct = null;
    this.selectedVariant = null;
    this.selectedOptions = {};

    this.init();
  }

  init() {
    // Plus button clicks - open popup
    document.querySelectorAll('.tv-grid__plus-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const handle = btn.dataset.productHandle;
        if (handle) {
          this.loadProduct(handle);
        }
      });
    });

    // Close button
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // Overlay click
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup.style.display !== 'none') {
        this.close();
      }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tv-custom-dropdown')) {
        this.closeAllDropdowns();
      }
    });

    // Add to cart button
    if (this.addToCartBtn) {
      this.addToCartBtn.addEventListener('click', () => this.addToCart());
    }
  }

  async loadProduct(handle) {
    try {
      const response = await fetch(`/products/${handle}.js`);
      if (!response.ok) throw new Error('Product not found');
      
      this.currentProduct = await response.json();
      this.selectedOptions = {};
      this.selectedVariant = this.currentProduct.variants[0]; // default to first variant
      
      this.renderPopup();
      this.open();
    } catch (error) {
      console.error('Error loading product:', error);
      alert('Unable to load product. Please try again.');
    }
  }

  renderPopup() {
    const product = this.currentProduct;
    
    // Update image
    const img = this.popup.querySelector('.tv-popup__image');
    if (img && product.featured_image) {
      img.src = product.featured_image;
      img.alt = product.title;
    }

    // Update title
    const title = this.popup.querySelector('.tv-popup__title');
    if (title) {
      title.textContent = product.title;
    }

    // Update price (format as currency)
    const price = this.popup.querySelector('.tv-popup__price');
    if (price) {
      price.textContent = this.formatMoney(this.selectedVariant.price);
    }

    // Update description
    const desc = this.popup.querySelector('.tv-popup__description');
    if (desc) {
      // Strip HTML tags from description
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = product.description;
      desc.textContent = tempDiv.textContent || tempDiv.innerText || '';
    }

    // Render variants
    this.renderVariants();
  }

  renderVariants() {
    const container = this.popup.querySelector('.tv-popup__variants');
    if (!container) return;

    container.innerHTML = '';

    // Group variants by option names
    const options = this.currentProduct.options;
    
    // IMPORTANT: Create array with original index preserved
    const optionsWithIndex = options.map((option, originalIndex) => ({
      option,
      originalIndex
    }));
    
    // Sort: Color FIRST, then Size
    const sortedOptions = [...optionsWithIndex].sort((a, b) => {
      const nameA = (a.option.name || a.option).toLowerCase();
      const nameB = (b.option.name || b.option).toLowerCase();
      
      // Color options come first
      if (nameA.includes('color') || nameA.includes('colour')) return -1;
      if (nameB.includes('color') || nameB.includes('colour')) return 1;
      
      // Size options come after color
      if (nameA.includes('size')) return 1;
      if (nameB.includes('size')) return -1;
      
      return 0; // maintain order for other options
    });
    
    sortedOptions.forEach(({ option, originalIndex }) => {
      const optionName = option.name || option; // handle both formats
      const optionValues = option.values || this.getOptionValues(originalIndex); // Use original index!
      
      if (!optionValues || optionValues.length === 0) return;

      const groupDiv = document.createElement('div');
      groupDiv.className = 'tv-popup__variant-group';
      
      const label = document.createElement('label');
      label.className = 'tv-popup__variant-label';
      label.textContent = optionName;
      groupDiv.appendChild(label);

      // Render based on option type
      if (optionName.toLowerCase() === 'color' || optionName.toLowerCase() === 'colour') {
        this.renderColorOptions(groupDiv, optionName, optionValues);
      } else if (optionName.toLowerCase() === 'size') {
        this.renderSizeOptions(groupDiv, optionName, optionValues);
      } else {
        // Default: render as buttons
        this.renderColorOptions(groupDiv, optionName, optionValues);
      }

      container.appendChild(groupDiv);
    });
  }

  renderColorOptions(container, optionName, values) {
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'tv-popup__variant-options tv-popup__variant-options--color';

    values.forEach(value => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tv-variant-btn';
      btn.dataset.option = optionName;
      btn.dataset.value = value;

      // Check if selected
      if (this.selectedOptions[optionName] === value) {
        btn.classList.add('tv-variant-btn--selected');
      }

      // Create SINGLE strip (left accent) with option color
      const strip = document.createElement('span');
      strip.className = 'tv-variant-strip';
      const colorHex = this.getColorHex(value);
      strip.style.backgroundColor = colorHex; // Strip color = option value
      btn.appendChild(strip);

      // Text label
      const label = document.createElement('span');
      label.className = 'tv-variant-label';
      label.textContent = value;
      btn.appendChild(label);

      btn.addEventListener('click', () => this.selectOption(optionName, value));

      optionsDiv.appendChild(btn);
    });

    container.appendChild(optionsDiv);
  }

  renderSizeOptions(container, optionName, values) {
    // Create custom dropdown container
    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = 'tv-custom-dropdown';
    dropdownWrapper.dataset.option = optionName;

    // Selected display button
    const selectedBtn = document.createElement('button');
    selectedBtn.type = 'button';
    selectedBtn.className = 'tv-custom-dropdown__selected';
    
    const selectedText = document.createElement('span');
    selectedText.className = 'tv-custom-dropdown__text';
    selectedText.textContent = this.selectedOptions[optionName] || 'Choose your size';
    selectedBtn.appendChild(selectedText);

    // Chevron icon
    const chevron = document.createElement('span');
    chevron.className = 'tv-custom-dropdown__chevron';
    chevron.innerHTML = '<svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6L11 1" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    selectedBtn.appendChild(chevron);

    // Dropdown menu
    const menu = document.createElement('div');
    menu.className = 'tv-custom-dropdown__menu';
    menu.style.display = 'none';

    values.forEach(value => {
      const option = document.createElement('div');
      option.className = 'tv-custom-dropdown__option';
      option.textContent = value;
      option.dataset.value = value;
      
      if (this.selectedOptions[optionName] === value) {
        option.classList.add('tv-custom-dropdown__option--selected');
      }

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectOption(optionName, value);
        this.closeAllDropdowns();
      });

      menu.appendChild(option);
    });

    // Toggle dropdown
    selectedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display === 'block';
      this.closeAllDropdowns();
      
      if (!isOpen) {
        menu.style.display = 'block';
        dropdownWrapper.classList.add('tv-custom-dropdown--open');
      }
    });

    dropdownWrapper.appendChild(selectedBtn);
    dropdownWrapper.appendChild(menu);
    container.appendChild(dropdownWrapper);
  }

  closeAllDropdowns() {
    const allMenus = this.popup.querySelectorAll('.tv-custom-dropdown__menu');
    allMenus.forEach(menu => menu.style.display = 'none');
    
    const allDropdowns = this.popup.querySelectorAll('.tv-custom-dropdown');
    allDropdowns.forEach(dd => dd.classList.remove('tv-custom-dropdown--open'));
  }

  selectOption(optionName, value) {
    this.selectedOptions[optionName] = value;
    
    // Find matching variant
    this.selectedVariant = this.currentProduct.variants.find(variant => {
      return Object.keys(this.selectedOptions).every((key, index) => {
        const optionIndex = this.currentProduct.options.findIndex(opt => 
          (opt.name || opt) === key
        );
        return variant.options[optionIndex] === this.selectedOptions[key];
      });
    });

    // Fallback to first variant if no match
    if (!this.selectedVariant) {
      this.selectedVariant = this.currentProduct.variants[0];
    }

    // Update price
    const price = this.popup.querySelector('.tv-popup__price');
    if (price) {
      price.textContent = this.formatMoney(this.selectedVariant.price);
    }

    // Update custom dropdown display text if it's a size option
    const dropdown = this.popup.querySelector(`.tv-custom-dropdown[data-option="${optionName}"]`);
    if (dropdown) {
      const textEl = dropdown.querySelector('.tv-custom-dropdown__text');
      if (textEl) {
        textEl.textContent = value;
      }
    }

    // Re-render variants to update selected state
    this.renderVariants();
  }

  getOptionValues(optionIndex) {
    const values = new Set();
    this.currentProduct.variants.forEach(variant => {
      if (variant.options[optionIndex]) {
        values.add(variant.options[optionIndex]);
      }
    });
    return Array.from(values);
  }

  getColorHex(colorName) {
    // Map common color names to hex values
    const colorMap = {
      'white': '#FFFFFF',
      'black': '#000000',
      'red': '#FF0000',
      'blue': '#0000FF',
      'green': '#00FF00',
      'yellow': '#FFFF00',
      'orange': '#FFA500',
      'purple': '#800080',
      'pink': '#FFC0CB',
      'brown': '#A52A2A',
      'grey': '#808080',
      'gray': '#808080',
      'navy': '#000080',
      'beige': '#F5F5DC'
    };

    return colorMap[colorName.toLowerCase()] || '#CCCCCC';
  }

  formatMoney(cents) {
    // Convert cents to euros and format with € symbol (not EUR text)
    const euros = (cents / 100).toFixed(2);
    return `${euros.replace('.', ',')}€`; // Euro symbol, not "EUR"
  }

  async addToCart() {
    if (!this.selectedVariant) {
      alert('Please select all options');
      return;
    }

    // Check if variant is available
    if (!this.selectedVariant.available) {
      alert('This variant is out of stock');
      return;
    }

    try {
      // Add main product to cart
      const formData = {
        items: [{
          id: this.selectedVariant.id,
          quantity: 1
        }]
      };

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to add to cart');

      // Special logic: if Black + Medium, auto-add "Soft Winter Jacket"
      await this.autoAddSoftWinterJacket();

      // Success - close popup (no alert)
      this.close();

      // Optionally trigger cart drawer/update
      document.dispatchEvent(new CustomEvent('cart:updated'));

    } catch (error) {
      console.error('Add to cart error:', error);
      alert('Failed to add to cart. Please try again.');
    }
  }

  async autoAddSoftWinterJacket() {
    // Check if selected variant is Black + Medium
    const isBlack = Object.values(this.selectedOptions).some(val => 
      val.toLowerCase() === 'black'
    );
    const isMedium = Object.values(this.selectedOptions).some(val => 
      val.toLowerCase() === 'medium' || val.toLowerCase() === 'm'
    );

    if (!isBlack || !isMedium) return;

    try {
      // Search for "Soft Winter Jacket" by handle or title
      // Try common handle formats
      const possibleHandles = [
        'soft-winter-jacket',
        'soft-winter-jacket-1',
        'winter-jacket-soft'
      ];

      for (const handle of possibleHandles) {
        try {
          const response = await fetch(`/products/${handle}.js`);
          if (response.ok) {
            const product = await response.json();
            if (product.variants && product.variants.length > 0) {
              // Add first available variant
              const variant = product.variants.find(v => v.available) || product.variants[0];
              
              await fetch('/cart/add.js', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  items: [{
                    id: variant.id,
                    quantity: 1
                  }]
                })
              });

              console.log('Auto-added Soft Winter Jacket');
              return; // Success, exit
            }
          }
        } catch (e) {
          // Try next handle
          continue;
        }
      }
    } catch (error) {
      console.error('Auto-add failed:', error);
      // Don't show error to user, it's a bonus feature
    }
  }

  open() {
    this.popup.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Focus close button for accessibility
    setTimeout(() => {
      if (this.closeBtn) {
        this.closeBtn.focus();
      }
    }, 100);
  }

  close() {
    this.popup.style.display = 'none';
    document.body.style.overflow = '';
    this.currentProduct = null;
    this.selectedVariant = null;
    this.selectedOptions = {};
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TvProductPopup();
  });
} else {
  new TvProductPopup();
}
