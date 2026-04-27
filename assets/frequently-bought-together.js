class FbtBundle extends HTMLElement {
  connectedCallback() {
    this._btn = this.querySelector('[data-fbt-add]');
    this._totalEl = this.querySelector('[data-fbt-total]');
    this._liveEl = this.querySelector('[data-fbt-live]');

    this.querySelectorAll('.fbt-product__checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => this._onCheckboxChange(e));
    });

    this._btn?.addEventListener('click', () => this._addBundle());
  }

  get _checkedCards() {
    return [...this.querySelectorAll('.fbt-product')].filter(
      (card) => card.querySelector('.fbt-product__checkbox')?.checked
    );
  }

  _formatMoney(cents) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: this.dataset.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  }

  _onCheckboxChange(e) {
    const card = e.target.closest('.fbt-product');
    if (card) {
      card.classList.toggle('fbt-product--checked', e.target.checked);
      card.classList.toggle('fbt-product--unchecked', !e.target.checked);
    }
    this._updateTotal();
    this._clearLiveRegion();
  }

  _updateTotal() {
    const total = this._checkedCards.reduce(
      (sum, card) => sum + parseInt(card.dataset.price || '0', 10),
      0
    );
    if (this._totalEl) this._totalEl.textContent = this._formatMoney(total);
    if (this._btn) this._btn.setAttribute('aria-label', `Add bundle to cart — ${this._formatMoney(total)}`);
  }

  _setLoading(isLoading) {
    if (!this._btn) return;
    if (isLoading) {
      this._btn.dataset.originalText = this._btn.textContent.trim();
      this._btn.textContent = 'Adding\u2026';
      this._btn.setAttribute('disabled', '');
      this._btn.setAttribute('aria-busy', 'true');
    } else {
      this._btn.removeAttribute('disabled');
      this._btn.removeAttribute('aria-busy');
    }
  }

  _setSuccess() {
    if (!this._btn) return;
    this._btn.classList.add('fbt-btn--success');
    this._btn.textContent = 'Added to Cart!';
    this._announce('Bundle added to cart successfully.');
    setTimeout(() => {
      this._btn?.classList.remove('fbt-btn--success');
      if (this._btn) this._btn.textContent = this._btn.dataset.originalText || 'Add Bundle to Cart';
    }, 2500);
  }

  _setError(message) {
    if (this._btn) this._btn.textContent = this._btn.dataset.originalText || 'Add Bundle to Cart';
    this._announce(message || 'Something went wrong. Please try again.');
  }

  // rAF trick forces screen readers to re-announce if the same message appears twice
  _announce(message) {
    if (!this._liveEl) return;
    this._liveEl.textContent = '';
    requestAnimationFrame(() => {
      if (this._liveEl) this._liveEl.textContent = message;
    });
    setTimeout(() => {
      if (this._liveEl) this._liveEl.textContent = '';
    }, 5000);
  }

  _clearLiveRegion() {
    if (this._liveEl) this._liveEl.textContent = '';
  }

  async _addBundle() {
    const cards = this._checkedCards;
    if (!cards.length) {
      this._announce('Please select at least one product to add to your cart.');
      return;
    }

    const items = cards.map((card) => ({
      id: parseInt(card.dataset.variantId, 10),
      quantity: 1,
    }));

    this._setLoading(true);

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.description || data.message || 'Could not add items to cart.');

      // fires the theme's native cart:update event so the cart drawer opens
      document.dispatchEvent(
        new CustomEvent('cart:update', {
          bubbles: true,
          detail: { resource: data, data: { itemCount: data.item_count, source: 'fbt-bundle' } },
        })
      );

      this._setSuccess();
    } catch (err) {
      this._setError(err.message);
    } finally {
      this._setLoading(false);
    }
  }
}

if (!customElements.get('fbt-bundle')) {
  customElements.define('fbt-bundle', FbtBundle);
}
