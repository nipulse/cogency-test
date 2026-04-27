# Frequently Bought Together — Custom Shopify Section

A lightweight, native "Frequently Bought Together" section for Shopify OS 2.0 themes. No apps, no third-party scripts — just Liquid, vanilla JS, and CSS variables that hook straight into whatever theme you're running.

---

## What it does

Adds a bundle section to product pages that shows the main product alongside 1–2 hand-picked complementary products. Customers can check or uncheck individual items, see the running bundle total update in real time, then add everything to the cart in a single click — no page reload.

![Section layout: three product cards in a row separated by + signs, with a total price and "Add Bundle to Cart" button below]

---

## Project structure

```
sections/
  frequently-bought-together.liquid   ← the section itself (Liquid + schema)

assets/
  frequently-bought-together.js       ← vanilla JS custom element for cart logic
```

No new dependencies. The JS file is loaded as an ES module and is only fetched on pages where the section is actually rendered.

---

## Setting up the metafield

The section reads complementary products from a **product reference list** metafield. You need to create the metafield definition once in your store settings, then assign products as needed.

### Step 1 — Create the metafield definition

1. Go to **Shopify Admin → Settings → Custom Data → Products**
2. Click **Add definition**
3. Fill in:
   - **Name:** Complementary Products (or whatever label makes sense to your team)
   - **Namespace and key:** `custom.complementary_products`
   - **Type:** Click "Select type" → choose **Product** → check **Allow multiple** (list)
4. Save

That's it. The definition only needs to be created once per store.

### Step 2 — Assign products

1. Open a product in your Shopify admin
2. Scroll down to the **Metafields** section at the bottom of the page
3. Find **Complementary Products** and click to select 1–2 products from your catalog
4. Save the product

The section automatically hides itself on any product page where this metafield hasn't been filled in, so there's no risk of an empty widget showing up on unrelated products.

---

## Adding the section to a product page

1. In Shopify Admin go to **Online Store → Themes → Customize**
2. Navigate to any product page
3. In the left sidebar, click **Add section**
4. Search for **Frequently Bought Together** and click it
5. Drag it to wherever you want it on the page (typically just below the main product info or above related products)
6. Adjust the heading text and color scheme in the section settings if needed
7. Hit **Save**

Because it uses Shopify's `enabled_on: { templates: ["product"] }` schema setting, it only shows up as an option on product page templates — you won't accidentally add it to a collection page.

---

## How it works under the hood

### Metafields

I went with a `list.product_reference` metafield (namespace `custom`, key `complementary_products`) rather than hardcoding product handles or using Shopify's built-in product recommendations API. The reasons:

- **Manual control.** The merchandising team can pick exactly which products appear together, rather than relying on an algorithm that might recommend unrelated items during the early days of a store.
- **Shopify-native.** Product reference metafields return full Liquid product objects, so you get images, prices, variant info, and URLs for free — no extra API calls.
- The `limit: 2` filter in the Liquid means even if someone adds 5 products to the metafield, only 2 complementary items will show.

### JavaScript

The whole interaction is handled by a custom element (`<fbt-bundle>`) defined in `frequently-bought-together.js`. A custom element felt like the right choice here because it:

- Scopes all the JS to the specific DOM subtree it owns
- Plays nicely with Shopify's section rendering (survives theme editor refreshes)
- Keeps things self-contained without polluting the global namespace

The cart add is a single `fetch` to `/cart/add.js` with an `items` array — Shopify's AJAX Cart API handles adding multiple variants atomically in one request. After a successful add, the code fires a `cart:update` CustomEvent on `document`. This is the same event name the theme's cart drawer already listens for (`ThemeEvents.cartUpdate = 'cart:update'`), so the drawer opens automatically without needing to touch any other theme files.

For the bundle total, prices are stored in cents as `data-price` attributes on each product card (matching how Shopify exposes `variant.price` in Liquid). The JS sums the checked cards and formats using `Intl.NumberFormat` with the shop's currency code (passed via `data-currency`).

### Accessibility

- Checkboxes have visible `<label>` elements and `aria-label` attributes with the product name
- The "Add Bundle to Cart" button's `aria-label` includes the current total price
- Cart success/error messages are announced via an `aria-live="polite"` region
- Product images use meaningful `alt` text from the product's media alt field (falls back to the product title)
- The section uses semantic HTML: `<ul role="list">` for the product row, `<h2>` for the heading

### Styling

Styles are scoped inside a `<style>` block in the section file using `.fbt-section` as the root class. All colors reference CSS custom properties from the theme (`--color-foreground`, `--color-background`, `--color-primary`, `--color-border`) so the section automatically adapts to any color scheme the merchant picks in the theme editor.

The layout uses flexbox: a horizontal row on desktop, stacking to a horizontal card format on mobile (< 750px). No media query breakpoint magic beyond that.

---

## Trade-offs and things I'd do differently with more time

**Variant selection.** Right now the section always uses the product's currently selected (or first available) variant. On a product page where the customer has selected a specific variant, it would be better to listen for Shopify's `variant:update` event and swap the variant ID dynamically. Worth adding, skipped for now to stay in scope.

**Bundle discount.** A common pattern is to offer a small discount when buying the bundle (e.g., "Save 10%"). The AJAX Cart API supports line-item properties and discount codes, so this would be achievable — just needs a cart script or Shopify Functions on the backend.

**Metafield population at scale.** Hand-assigning complementary products works fine for small catalogs but doesn't scale to thousands of SKUs. A better long-term solution would be a bulk import via the Admin API or a metafield management app. The metafield structure I've chosen is compatible with both paths.

**Out-of-stock handling.** Currently if a complementary product is sold out, the section still shows it and the cart API will return an error. A cleaner UX would grey out unavailable variants and disable their checkbox. Easy to add with a Liquid `unless variant.available` check.

**A/B testing.** No instrumentation beyond the ARIA live region. In a real project I'd add a `data-fbt-impression` attribute on the bundle container and fire an analytics event when the section scrolls into view, plus a separate event on successful bundle add.

---

## Local development

If you're using the Shopify CLI:

```bash
shopify theme dev --store=your-store.myshopify.com
```

The section will appear in the theme editor as "Frequently Bought Together" under Add Section on any product template.
