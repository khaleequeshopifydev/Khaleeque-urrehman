/**
 * tv-grid.js
 * ─────────────────────────────────────────────────────────────
 * Tisso Vison — Product Grid JavaScript
 * Handles popup modal, variant selection, and add to cart
 *
 * Cart update strategy (same as Horizon theme):
 *   1. POST to /cart/add.js with FormData
 *   2. GET /cart.js for updated cart state
 *   3. Directly call cart-icon's renderCartBubble (public method)
 *   4. Dispatch CartLinesUpdateEvent (Horizon's internal event)
 *      so the cart drawer also updates
 * ─────────────────────────────────────────────────────────────
 */

class TvProductPopup {
  constructor() {
    this.popup = document.getElementById('tv-product-popup');
    if (!this.popup) return;

    this.overlay   = this.popup.querySelector('.tv-popup__overlay');
    this.modal     = this.popup.querySelector('.tv-popup__modal');
    this.closeBtn  = this.popup.querySelector('.tv-popup__close');
    this.addToCartBtn = this.popup.querySelector('.tv-popup__add-btn');

    this.currentProduct  = null;
    this.selectedVariant = null;
    this.selectedOptions = {};

    this.init();
  }

  // ─────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────
  init() {
    // Plus button clicks — open popup
    document.querySelectorAll('.tv-grid__plus-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const handle = btn.dataset.productHandle;
        if (handle) this.loadProduct(handle);
      });
    });

    // Close button
    this.closeBtn?.addEventListener('click', () => this.close());

    // Overlay click
    this.overlay?.addEventListener('click', () => this.close());

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup.style.display !== 'none') this.close();
    });

    // Close custom dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tv-custom-dropdown')) this.closeAllDropdowns();
    });

    // Add to cart
    this.addToCartBtn?.addEventListener('click', () => this.addToCart());
  }

  // ─────────────────────────────────────────────────────────────
  // LOAD PRODUCT
  // ─────────────────────────────────────────────────────────────
  async loadProduct(handle) {
    try {
      const response = await fetch(`/products/${handle}.js`);
      if (!response.ok) throw new Error('Product not found');

      this.currentProduct  = await response.json();
      this.selectedOptions = {};
      this.selectedVariant = this.currentProduct.variants[0]; // default first variant

      this.renderPopup();
      this.open();
    } catch (error) {
      console.error('[TvPopup] Error loading product:', error);
      alert('Unable to load product. Please try again.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER POPUP CONTENT
  // ─────────────────────────────────────────────────────────────
  renderPopup() {
    const product = this.currentProduct;

    // Image
    const img = this.popup.querySelector('.tv-popup__image');
    if (img && product.featured_image) {
      img.src = product.featured_image;
      img.alt = product.title;
    }

    // Title
    const title = this.popup.querySelector('.tv-popup__title');
    if (title) title.textContent = product.title;

    // Price
    const price = this.popup.querySelector('.tv-popup__price');
    if (price) price.textContent = this.formatMoney(this.selectedVariant.price);

    // Description (strip HTML tags)
    const desc = this.popup.querySelector('.tv-popup__description');
    if (desc) {
      const tmp = document.createElement('div');
      tmp.innerHTML = product.description;
      desc.textContent = tmp.textContent || tmp.innerText || '';
    }

    this.renderVariants();
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER VARIANTS
  // ─────────────────────────────────────────────────────────────
  renderVariants() {
    const container = this.popup.querySelector('.tv-popup__variants');
    if (!container) return;

    container.innerHTML = '';

    // Preserve original index before sorting
    const optionsWithIndex = this.currentProduct.options.map((option, originalIndex) => ({
      option,
      originalIndex
    }));

    // Sort: Color FIRST, then Size
    const sorted = [...optionsWithIndex].sort((a, b) => {
      const nameA = (a.option.name || a.option).toLowerCase();
      const nameB = (b.option.name || b.option).toLowerCase();
      if (nameA.includes('color') || nameA.includes('colour')) return -1;
      if (nameB.includes('color') || nameB.includes('colour')) return 1;
      if (nameA.includes('size')) return 1;
      if (nameB.includes('size')) return -1;
      return 0;
    });

    sorted.forEach(({ option, originalIndex }) => {
      const optionName   = option.name || option;
      const optionValues = option.values || this.getOptionValues(originalIndex);
      if (!optionValues || optionValues.length === 0) return;

      const groupDiv = document.createElement('div');
      groupDiv.className = 'tv-popup__variant-group';

      const label = document.createElement('label');
      label.className = 'tv-popup__variant-label';
      label.textContent = optionName;
      groupDiv.appendChild(label);

      const isColor = optionName.toLowerCase() === 'color' || optionName.toLowerCase() === 'colour';
      const isSize  = optionName.toLowerCase() === 'size';

      if (isColor) {
        this.renderColorOptions(groupDiv, optionName, optionValues);
      } else if (isSize) {
        this.renderSizeOptions(groupDiv, optionName, optionValues);
      } else {
        this.renderColorOptions(groupDiv, optionName, optionValues); // default: pill buttons
      }

      container.appendChild(groupDiv);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // COLOR OPTION BUTTONS
  // ─────────────────────────────────────────────────────────────
  renderColorOptions(container, optionName, values) {
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'tv-popup__variant-options tv-popup__variant-options--color';

    values.forEach(value => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tv-variant-btn';
      btn.dataset.option = optionName;
      btn.dataset.value  = value;
      if (this.selectedOptions[optionName] === value) btn.classList.add('tv-variant-btn--selected');

      // Single left-edge color strip (~6px, Figma: 5.807px)
      const strip = document.createElement('span');
      strip.className = 'tv-variant-strip';
      strip.style.backgroundColor = this.getColorHex(value);
      btn.appendChild(strip);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'tv-variant-label';
      labelSpan.textContent = value;
      btn.appendChild(labelSpan);

      btn.addEventListener('click', () => this.selectOption(optionName, value));
      optionsDiv.appendChild(btn);
    });

    container.appendChild(optionsDiv);
  }

  // ─────────────────────────────────────────────────────────────
  // CUSTOM SIZE DROPDOWN
  // ─────────────────────────────────────────────────────────────
  renderSizeOptions(container, optionName, values) {
    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = 'tv-custom-dropdown';
    dropdownWrapper.dataset.option = optionName;

    // Trigger button
    const selectedBtn = document.createElement('button');
    selectedBtn.type = 'button';
    selectedBtn.className = 'tv-custom-dropdown__selected';

    const selectedText = document.createElement('span');
    selectedText.className = 'tv-custom-dropdown__text';
    selectedText.textContent = this.selectedOptions[optionName] || 'Choose your size';
    selectedBtn.appendChild(selectedText);

    // Chevron
    const chevron = document.createElement('span');
    chevron.className = 'tv-custom-dropdown__chevron';
    chevron.innerHTML = '<svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6L11 1" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    selectedBtn.appendChild(chevron);

    // Menu
    const menu = document.createElement('div');
    menu.className = 'tv-custom-dropdown__menu';
    menu.style.display = 'none';

    values.forEach(value => {
      const option = document.createElement('div');
      option.className = 'tv-custom-dropdown__option';
      option.textContent = value;
      option.dataset.value = value;
      if (this.selectedOptions[optionName] === value) option.classList.add('tv-custom-dropdown__option--selected');

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectOption(optionName, value);
        this.closeAllDropdowns();
      });

      menu.appendChild(option);
    });

    // Toggle open/close
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
    this.popup.querySelectorAll('.tv-custom-dropdown__menu').forEach(m => m.style.display = 'none');
    this.popup.querySelectorAll('.tv-custom-dropdown').forEach(d => d.classList.remove('tv-custom-dropdown--open'));
  }

  // ─────────────────────────────────────────────────────────────
  // SELECT OPTION & UPDATE VARIANT
  // ─────────────────────────────────────────────────────────────
  selectOption(optionName, value) {
    this.selectedOptions[optionName] = value;

    // Find matching variant
    this.selectedVariant = this.currentProduct.variants.find(variant =>
      Object.keys(this.selectedOptions).every(key => {
        const idx = this.currentProduct.options.findIndex(opt => (opt.name || opt) === key);
        return variant.options[idx] === this.selectedOptions[key];
      })
    ) || this.currentProduct.variants[0];

    // Update price
    const price = this.popup.querySelector('.tv-popup__price');
    if (price) price.textContent = this.formatMoney(this.selectedVariant.price);

    // Update dropdown display text
    const dropdown = this.popup.querySelector(`.tv-custom-dropdown[data-option="${optionName}"]`);
    if (dropdown) {
      const textEl = dropdown.querySelector('.tv-custom-dropdown__text');
      if (textEl) textEl.textContent = value;
    }

    this.renderVariants();
  }

  // ─────────────────────────────────────────────────────────────
  // ADD TO CART  (same mechanism as Horizon product-form.js)
  // ─────────────────────────────────────────────────────────────
  async addToCart() {
    console.log('[TvPopup] Add to Cart clicked');
    console.log('[TvPopup] Variant:', this.selectedVariant);
    console.log('[TvPopup] Options:', this.selectedOptions);

    if (!this.selectedVariant) {
      alert('Please select all options');
      return;
    }
    if (!this.selectedVariant.available) {
      alert('This variant is out of stock');
      return;
    }

    const addBtn     = this.popup.querySelector('.tv-popup__add-btn');
    const btnText    = addBtn.querySelector('.tv-btn__text');
    const origText   = btnText.textContent;

    try {
      // ── Loading state (CSS driven via data-loading attribute) ─
      btnText.textContent       = 'ADDING...';
      addBtn.disabled           = true;
      addBtn.dataset.loading    = 'true';
      addBtn.removeAttribute('data-added');

      // ── POST to Shopify AJAX Cart API ─────────────────────
      const formData = new FormData();
      formData.append('id',       this.selectedVariant.id);
      formData.append('quantity', '1');

      const addRes = await fetch('/cart/add.js', {
        method: 'POST',
        body:   formData
      });

      if (!addRes.ok) {
        const err = await addRes.json().catch(() => ({ message: 'Failed to add to cart' }));
        throw new Error(err.description || err.message || 'Failed to add to cart');
      }

      console.log('[TvPopup] Product added to cart');

      // ── Auto-add "Soft Winter Jacket" if Black + Medium ───
      await this.autoAddSoftWinterJacket();

      // ── Fetch updated cart ────────────────────────────────
      const cartRes = await fetch('/cart.js');
      const cart    = await cartRes.json();
      console.log('[TvPopup] Updated cart:', cart);

      // ── Update cart icon (Horizon cart-icon custom element)
      // cart-icon exposes renderCartBubble as a public method
      document.querySelectorAll('cart-icon').forEach(el => {
        if (typeof el.renderCartBubble === 'function') {
          el.renderCartBubble(cart.item_count, true);
        }
      });

      // ── Also persist count for page transitions (Horizon uses sessionStorage)
      sessionStorage.setItem('cart-count', JSON.stringify({
        value:     String(cart.item_count),
        timestamp: Date.now()
      }));

      // ── Dispatch Horizon's CartLinesUpdateEvent ───────────
      // Horizon's cart-icon, header-actions, and cart-drawer all
      // listen for StandardEvents.cartLinesUpdate on document.
      // We create an equivalent CustomEvent with the resolved promise
      // so the promise-based listeners resolve immediately.
      const resolvedPromise = Promise.resolve({
        cart: { totalQuantity: cart.item_count },
        detail: {
          items:      cart.items,
          itemCount:  cart.item_count,
          source:     'tv-popup',
          sourceId:   'tv-product-popup'
        }
      });

      document.dispatchEvent(new CustomEvent('shopify:cart:lines-update', {
        bubbles: true,
        detail: {
          action:  'add',
          context: 'product',
          lines: [{ merchandiseId: String(this.selectedVariant.id), quantity: 1 }],
          promise: resolvedPromise
        }
      }));

      console.log('[TvPopup] Dispatched shopify:cart:lines-update');

      // ── Success state then close ──────────────────────────
      btnText.textContent       = 'ADDED ✓';
      addBtn.dataset.added      = 'true';
      delete addBtn.dataset.loading;

      setTimeout(() => {
        this.close();
        btnText.textContent  = origText;
        addBtn.disabled      = false;
        delete addBtn.dataset.added;
        delete addBtn.dataset.loading;
      }, 900);

    } catch (error) {
      console.error('[TvPopup] Add to cart error:', error);
      btnText.textContent  = origText;
      addBtn.disabled      = false;
      delete addBtn.dataset.loading;
      delete addBtn.dataset.added;
      alert(error.message || 'Failed to add to cart. Please try again.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // AUTO-ADD SOFT WINTER JACKET (Black + Medium rule)
  // ─────────────────────────────────────────────────────────────
  // AUTO-ADD SOFT WINTER JACKET (Black + Medium rule)
  // ─────────────────────────────────────────────────────────────
  async autoAddSoftWinterJacket() {
    const isBlack = Object.values(this.selectedOptions).some(v => v.toLowerCase() === 'black');
    const isMedium = Object.values(this.selectedOptions).some(v =>
      v.toLowerCase() === 'medium' || v.toLowerCase() === 'm'
    );

    console.log(`[TvPopup] Auto-add check — Black: ${isBlack}, Medium: ${isMedium}`);
    if (!isBlack || !isMedium) return;

    console.log('[TvPopup] Black + Medium detected! Adding Soft Winter Jacket...');

    try {
      // STEP 1: Search by title using Shopify Predictive Search API
      // This is the most reliable way - finds by actual product title
      const searchRes = await fetch(
        `/search/suggest.json?q=Soft+Winter+Jacket&resources[type]=product&resources[limit]=5`
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const products = searchData?.resources?.results?.products || [];
        console.log('[TvPopup] Search results:', products);

        // Find exact or close match by title
        const match = products.find(p =>
          p.title.toLowerCase().includes('soft winter jacket') ||
          p.title.toLowerCase() === 'soft winter jacket'
        );

        if (match) {
          console.log('[TvPopup] Found via search:', match.title, '| Handle:', match.handle);
          const added = await this.addProductByHandle(match.handle);
          if (added) return;
        }
      }

      // STEP 2: Fallback — try known handle formats directly
      const handles = [
        'dark-winter-jacket',    // confirmed handle from Shopify admin
        'soft-winter-jacket',
        'soft-winter-jacket-1',
        'winter-jacket-soft',
        'winter-soft-jacket'
      ];

      for (const handle of handles) {
        console.log(`[TvPopup] Trying handle: "${handle}"`);
        const added = await this.addProductByHandle(handle);
        if (added) return;
      }

      console.warn('[TvPopup] ⚠️ Soft Winter Jacket not found via search or handles.');

    } catch (error) {
      console.error('[TvPopup] Auto-add error:', error);
    }
  }

  // Helper: fetch product by handle and add to cart
  async addProductByHandle(handle) {
    try {
      const res = await fetch(`/products/${handle}.js`);
      if (!res.ok) return false;

      const product = await res.json();
      console.log('[TvPopup] Product found:', product.title);

      const variant = product.variants.find(v => v.available) || product.variants[0];
      if (!variant) return false;

      const fd = new FormData();
      fd.append('id',       variant.id);
      fd.append('quantity', '1');

      const addRes = await fetch('/cart/add.js', { method: 'POST', body: fd });

      if (addRes.ok) {
        console.log('[TvPopup] ✅ Soft Winter Jacket auto-added! Variant ID:', variant.id);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  getOptionValues(optionIndex) {
    const values = new Set();
    this.currentProduct.variants.forEach(v => {
      if (v.options[optionIndex]) values.add(v.options[optionIndex]);
    });
    return Array.from(values);
  }

  getColorHex(colorName) {
    const map = {
      white:  '#FFFFFF',
      black:  '#000000',
      red:    '#FF0000',
      blue:   '#0000FF',
      green:  '#00CC66',
      yellow: '#FFFF00',
      orange: '#FFA500',
      purple: '#800080',
      pink:   '#FFC0CB',
      brown:  '#A52A2A',
      grey:   '#808080',
      gray:   '#808080',
      navy:   '#000080',
      beige:  '#F5F5DC',
      silver: '#C0C0C0',
      gold:   '#FFD700'
    };
    return map[colorName.toLowerCase()] || '#CCCCCC';
  }

  formatMoney(cents) {
    // Format as European: "70,00€"
    return `${(cents / 100).toFixed(2).replace('.', ',')}€`;
  }

  // ─────────────────────────────────────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────────────────────────────────────
  open() {
    this.popup.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.closeBtn?.focus(), 100);
  }

  close() {
    this.popup.style.display = 'none';
    document.body.style.overflow = '';
    this.currentProduct  = null;
    this.selectedVariant = null;
    this.selectedOptions = {};
  }
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TvProductPopup());
} else {
  new TvProductPopup();
}
