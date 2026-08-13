/**
 * tv-grid.js
 * ─────────────────────────────────────────────────────────────
 * Tisso Vison — Product Grid JavaScript
 * Popup: variant rendering, custom dropdown, add to cart
 *
 * Add to cart strategy:
 *   Use a real <form> + <product-form-component> exactly like
 *   Horizon does on every product page. This guarantees cart
 *   icon, cart drawer, and all theme listeners update instantly
 *   — no custom events, no manual DOM patching needed.
 * ─────────────────────────────────────────────────────────────
 */

class TvProductPopup {
  constructor() {
    this.popup = document.getElementById('tv-product-popup');
    if (!this.popup) return;

    this.overlay  = this.popup.querySelector('.tv-popup__overlay');
    this.closeBtn = this.popup.querySelector('.tv-popup__close');

    this.currentProduct  = null;
    this.selectedVariant = null;
    this.selectedOptions = {};

    this.init();
  }

  // ─────────────────────────────────────────────────────────────
  // INIT — bind static listeners
  // ─────────────────────────────────────────────────────────────
  init() {
    // Plus buttons on grid cards
    document.querySelectorAll('.tv-grid__plus-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const handle = btn.dataset.productHandle;
        if (handle) this.loadProduct(handle);
      });
    });

    // Close button
    this.closeBtn?.addEventListener('click', () => this.close());

    // Click on overlay
    this.overlay?.addEventListener('click', () => this.close());

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup.style.display !== 'none') this.close();
    });

    // Close custom dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tv-custom-dropdown')) this.closeAllDropdowns();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // LOAD PRODUCT via Shopify product JSON endpoint
  // ─────────────────────────────────────────────────────────────
  async loadProduct(handle) {
    try {
      const res = await fetch(`/products/${handle}.js`);
      if (!res.ok) throw new Error('Product not found');

      this.currentProduct  = await res.json();
      this.selectedOptions = {};
      this.selectedVariant = this.currentProduct.variants[0];

      this.renderPopup();
      this.open();
    } catch (err) {
      console.error('[TvPopup] loadProduct error:', err);
      alert('Unable to load product. Please try again.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER POPUP CONTENT
  // ─────────────────────────────────────────────────────────────
  renderPopup() {
    const p = this.currentProduct;

    // Image
    const img = this.popup.querySelector('.tv-popup__image');
    if (img) { img.src = p.featured_image || ''; img.alt = p.title; }

    // Title
    const title = this.popup.querySelector('.tv-popup__title');
    if (title) title.textContent = p.title;

    // Price
    const price = this.popup.querySelector('.tv-popup__price');
    if (price) price.textContent = this.formatMoney(this.selectedVariant.price);

    // Description — strip HTML
    const desc = this.popup.querySelector('.tv-popup__description');
    if (desc) {
      const tmp = document.createElement('div');
      tmp.innerHTML = p.description;
      desc.textContent = tmp.textContent || tmp.innerText || '';
    }

    // Variants
    this.renderVariants();

    // Build the Horizon-compatible add-to-cart form
    this.renderCartForm();
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER VARIANT OPTIONS
  // ─────────────────────────────────────────────────────────────
  renderVariants() {
    const container = this.popup.querySelector('.tv-popup__variants');
    if (!container) return;
    container.innerHTML = '';

    // Preserve original index before sorting
    const optionsWithIndex = this.currentProduct.options.map((opt, i) => ({ opt, i }));

    // Color first, Size second
    const sorted = [...optionsWithIndex].sort((a, b) => {
      const na = (a.opt.name || a.opt).toLowerCase();
      const nb = (b.opt.name || b.opt).toLowerCase();
      if (na.includes('color') || na.includes('colour')) return -1;
      if (nb.includes('color') || nb.includes('colour')) return 1;
      if (na.includes('size')) return 1;
      if (nb.includes('size')) return -1;
      return 0;
    });

    sorted.forEach(({ opt, i }) => {
      const name   = opt.name || opt;
      const values = opt.values || this.getOptionValues(i);
      if (!values?.length) return;

      const group = document.createElement('div');
      group.className = 'tv-popup__variant-group';

      const lbl = document.createElement('label');
      lbl.className = 'tv-popup__variant-label';
      lbl.textContent = name;
      group.appendChild(lbl);

      const isColor = /colou?r/i.test(name);
      const isSize  = /size/i.test(name);

      if (isColor) {
        this.renderColorOptions(group, name, values);
      } else if (isSize) {
        this.renderSizeDropdown(group, name, values);
      } else {
        this.renderColorOptions(group, name, values);
      }

      container.appendChild(group);
    });
  }

  renderColorOptions(container, optionName, values) {
    const wrap = document.createElement('div');
    wrap.className = 'tv-popup__variant-options tv-popup__variant-options--color';

    values.forEach(val => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tv-variant-btn';
      btn.dataset.option = optionName;
      btn.dataset.value  = val;
      if (this.selectedOptions[optionName] === val) btn.classList.add('tv-variant-btn--selected');

      const strip = document.createElement('span');
      strip.className = 'tv-variant-strip';
      strip.style.backgroundColor = this.getColorHex(val);
      btn.appendChild(strip);

      const span = document.createElement('span');
      span.className = 'tv-variant-label';
      span.textContent = val;
      btn.appendChild(span);

      btn.addEventListener('click', () => this.selectOption(optionName, val));
      wrap.appendChild(btn);
    });

    container.appendChild(wrap);
  }

  renderSizeDropdown(container, optionName, values) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tv-custom-dropdown';
    wrapper.dataset.option = optionName;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tv-custom-dropdown__selected';

    const text = document.createElement('span');
    text.className = 'tv-custom-dropdown__text';
    text.textContent = this.selectedOptions[optionName] || 'Choose your size';
    trigger.appendChild(text);

    const chevron = document.createElement('span');
    chevron.className = 'tv-custom-dropdown__chevron';
    chevron.innerHTML = '<svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6L11 1" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    trigger.appendChild(chevron);

    const menu = document.createElement('div');
    menu.className = 'tv-custom-dropdown__menu';
    menu.style.display = 'none';

    values.forEach(val => {
      const item = document.createElement('div');
      item.className = 'tv-custom-dropdown__option';
      item.textContent = val;
      item.dataset.value = val;
      if (this.selectedOptions[optionName] === val) item.classList.add('tv-custom-dropdown__option--selected');

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectOption(optionName, val);
        this.closeAllDropdowns();
      });
      menu.appendChild(item);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display === 'block';
      this.closeAllDropdowns();
      if (!isOpen) {
        menu.style.display = 'block';
        wrapper.classList.add('tv-custom-dropdown--open');
      }
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    container.appendChild(wrapper);
  }

  closeAllDropdowns() {
    this.popup.querySelectorAll('.tv-custom-dropdown__menu').forEach(m => m.style.display = 'none');
    this.popup.querySelectorAll('.tv-custom-dropdown').forEach(d => d.classList.remove('tv-custom-dropdown--open'));
  }

  // ─────────────────────────────────────────────────────────────
  // SELECT OPTION
  // ─────────────────────────────────────────────────────────────
  selectOption(name, val) {
    this.selectedOptions[name] = val;

    // Match variant
    this.selectedVariant = this.currentProduct.variants.find(v =>
      Object.keys(this.selectedOptions).every(k => {
        const idx = this.currentProduct.options.findIndex(o => (o.name || o) === k);
        return v.options[idx] === this.selectedOptions[k];
      })
    ) || this.currentProduct.variants[0];

    // Update price
    const price = this.popup.querySelector('.tv-popup__price');
    if (price) price.textContent = this.formatMoney(this.selectedVariant.price);

    // Update dropdown display
    const dd = this.popup.querySelector(`.tv-custom-dropdown[data-option="${name}"]`);
    if (dd) {
      const t = dd.querySelector('.tv-custom-dropdown__text');
      if (t) t.textContent = val;
    }

    // Update hidden variant ID in the form
    const variantInput = this.popup.querySelector('.tv-popup__variant-id');
    if (variantInput) variantInput.value = this.selectedVariant.id;

    this.renderVariants();
  }

  // ─────────────────────────────────────────────────────────────
  // BUILD HORIZON-COMPATIBLE CART FORM
  // Wraps a <product-form-component> around a real <form>
  // so ALL of Horizon's cart listeners fire automatically.
  // ─────────────────────────────────────────────────────────────
  renderCartForm() {
    const container = this.popup.querySelector('.tv-popup__form-container');
    if (!container) return;

    const product    = this.currentProduct;
    const arrowUrl   = container.dataset.arrowUrl || '';
    const sectionIds = [];
    document.querySelectorAll('cart-items-component').forEach(el => {
      if (el.dataset.sectionId) sectionIds.push(el.dataset.sectionId);
    });

    container.innerHTML = `
      <product-form-component
        data-product-id="${product.id}"
        data-product-url="/products/${product.handle}"
        on:submit="/handleSubmit"
        data-quantity-default="1"
      >
        <div class="visually-hidden" aria-live="assertive" role="status" ref="liveRegion"></div>
        <form method="post" action="/cart/add" id="tv-cart-form-${product.id}" data-type="add-to-cart-form">
          <input type="hidden" name="id" ref="variantId" class="tv-popup__variant-id" value="${this.selectedVariant.id}">
          <input type="hidden" name="quantity" value="1">
          ${sectionIds.map(id => `<input type="hidden" name="sections" value="${id}">`).join('')}

          <button type="submit" name="add" class="tv-popup__add-btn">
            <span class="tv-btn__text">ADD TO CART</span>
            <span class="tv-btn__arrow" aria-hidden="true">
              <img src="${arrowUrl}" alt="" width="26" height="12" class="tv-btn__arrow-icon tv-btn__arrow-icon--light">
            </span>
          </button>
        </form>
      </product-form-component>
    `;
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

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  getOptionValues(idx) {
    const s = new Set();
    this.currentProduct.variants.forEach(v => { if (v.options[idx]) s.add(v.options[idx]); });
    return [...s];
  }

  getColorHex(name) {
    const map = {
      white:'#FFFFFF', black:'#000000', red:'#FF0000', blue:'#0000FF',
      green:'#00CC66', yellow:'#FFFF00', orange:'#FFA500', purple:'#800080',
      pink:'#FFC0CB', brown:'#A52A2A', grey:'#808080', gray:'#808080',
      navy:'#000080', beige:'#F5F5DC', silver:'#C0C0C0', gold:'#FFD700'
    };
    return map[name.toLowerCase()] || '#CCCCCC';
  }

  formatMoney(cents) {
    return `${(cents / 100).toFixed(2).replace('.', ',')}€`;
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
