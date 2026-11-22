/* ============================================================
   DOKAN — product.js (product detail page)
   Layout: image gallery on the left, buying panel on the right.
   ============================================================ */

let currentProduct = null;
let selectedQty = 1;
let selectedColor = "";

/* Lets a mouse user drag a horizontal strip sideways to scroll it.
   A drag never counts as a click, so dragging doesn't switch the main image. */
function enableDragScroll(el) {
  let isDown = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    isDown = true;
    moved = false;
    startX = e.clientX;
    startScroll = el.scrollLeft;
    el.classList.add("is-dragging");
  });

  el.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    el.scrollLeft = startScroll - dx;
  });

  const stop = () => {
    isDown = false;
    el.classList.remove("is-dragging");
  };
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointerleave", stop);
  el.addEventListener("pointercancel", stop);

  // Capture phase: swallow the click that follows a drag before the thumbnail sees it.
  el.addEventListener(
    "click",
    (e) => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    },
    true
  );
}

/* Opens the main product image full-size.
   - Click the image to zoom in (2.5x). Move the mouse to look around the zoomed image. Click again to zoom out.
   - Click the backdrop, the × button, or press Esc to close. */
function openLightbox(src, alt) {
  const overlay = document.createElement("div");
  overlay.className = "pd-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <button class="pd-lightbox-close" aria-label="Close image">×</button>
    <div class="pd-lightbox-stage">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />
    </div>`;

  const stage = overlay.querySelector(".pd-lightbox-stage");
  const img = stage.querySelector("img");
  let zoomed = false;

  const setZoom = (on) => {
    zoomed = on;
    stage.classList.toggle("is-zoomed", on);
    if (!on) img.style.transformOrigin = "50% 50%";
  };

  stage.addEventListener("click", (e) => {
    e.stopPropagation(); // clicking the image must not close the viewer
    setZoom(!zoomed);
  });

  // While zoomed, the spot under the cursor stays put and the image pans around it.
  stage.addEventListener("pointermove", (e) => {
    if (!zoomed) return;
    const r = stage.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
  });

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  overlay.addEventListener("click", close); // backdrop and × button
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
}

function discountPercent(product) {
  if (!product.comparePrice || product.comparePrice <= product.price) return 0;
  return Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
}

function renderProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  currentProduct = ProductsDB.find(id);

  const wrap = document.getElementById("productDetail");
  if (!currentProduct) {
    wrap.innerHTML = `<div class="empty-state">
      <p>We couldn't find that product.</p>
      <a class="btn btn-primary" href="index.html">Back to shop</a>
    </div>`;
    return;
  }

  document.title = `${currentProduct.name} — Dokan`;

  // Colour options (only for products that have them). The first colour is picked by default.
  const colours = (currentProduct.colors || []).map(decodeColour);
  selectedColor = colours[0] ? colours[0].name : "";
  const colorBlock = colours.length
    ? `<div class="pd-colors">
        <span class="pd-colors-label">Colour: <strong id="pdColorName">${escapeHtml(selectedColor)}</strong></span>
        <div class="pd-color-options" role="group" aria-label="Choose a colour">
          ${colours
            .map(
              (c, i) => `<button type="button" class="pd-color ${i === 0 ? "is-active" : ""}" data-color="${escapeHtml(c.name)}" aria-pressed="${i === 0}" title="${escapeHtml(c.name)}">${c.hex ? `<span class="pd-colour-dot" style="background:${escapeHtml(c.hex)}"></span>` : ""}${escapeHtml(c.name)}</button>`
            )
            .join("")}
        </div>
      </div>`
    : "";

  const images = currentProduct.images.length ? currentProduct.images : [currentProduct.image];
  const off = discountPercent(currentProduct);
  const outOfStock = currentProduct.stock === 0;

  wrap.innerHTML = `
    <div class="pd-gallery">
      <div class="pd-main">
        <img id="pdMainImage" src="${escapeHtml(images[0])}" alt="${escapeHtml(currentProduct.name)}" />
      </div>
      ${
        images.length > 1
          ? `<div class="pd-thumbs" role="list">
              ${images
                .map(
                  (src, i) => `
                <button class="pd-thumb ${i === 0 ? "is-active" : ""}" data-index="${i}" aria-label="Show image ${i + 1}">
                  <img src="${escapeHtml(src)}" alt="" />
                </button>`
                )
                .join("")}
            </div>`
          : ""
      }
    </div>

    <div class="product-detail-info">
      <p class="pd-brand">Brand: <strong>${escapeHtml(currentProduct.brand || "No Brand")}</strong></p>
      <h1>${escapeHtml(currentProduct.name)}</h1>

      <div class="pd-price-row">
        <span class="pd-price" id="unitPrice">${formatPrice(currentProduct.price)}</span>
        ${
          off
            ? `<span class="pd-compare">${formatPrice(currentProduct.comparePrice)}</span>
               <span class="pd-off">-${off}%</span>`
            : ""
        }
      </div>

      <p class="stock-note">${outOfStock ? "Out of stock" : `${currentProduct.stock} in stock`}</p>
      <div class="pd-desc-wrap">
        <div class="product-detail-desc pd-desc" id="pdDesc">${descriptionHtml(currentProduct.description)}</div>
        <button type="button" class="pd-desc-toggle" id="pdDescToggle" hidden>More</button>
      </div>

      ${colorBlock}

      <div class="qty-row">
        <label for="qtyInput">Quantity</label>
        <div class="qty-stepper">
          <button id="qtyMinus" aria-label="Decrease quantity">−</button>
          <input type="number" id="qtyInput" min="1" max="${currentProduct.stock}" value="1" />
          <button id="qtyPlus" aria-label="Increase quantity">+</button>
        </div>
      </div>

      <div class="total-preview">
        Line total: <strong id="linePreview">${formatPrice(currentProduct.price)}</strong>
      </div>

      <div class="pd-actions">
        <button class="btn btn-outline btn-lg" id="addToCartBtn" ${outOfStock ? "disabled" : ""}>Add to cart</button>
        <button class="btn btn-primary btn-lg" id="buyNowBtn" ${outOfStock ? "disabled" : ""}>Buy now</button>
      </div>
      <a class="btn btn-outline btn-block" href="index.html">← Continue browsing</a>
    </div>
  `;

  // ----- gallery -----
  const strip = wrap.querySelector(".pd-thumbs");
  if (strip) enableDragScroll(strip);
  const mainImage = document.getElementById("pdMainImage");
  mainImage.addEventListener("click", () => openLightbox(mainImage.src, currentProduct.name));
  wrap.querySelectorAll(".pd-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const i = Number(thumb.dataset.index);
      mainImage.src = images[i];
      wrap.querySelectorAll(".pd-thumb").forEach((t) => t.classList.toggle("is-active", t === thumb));
    });
  });

  // ----- quantity -----
  const qtyInput = document.getElementById("qtyInput");
  const linePreview = document.getElementById("linePreview");

  function updatePreview() {
    let qty = parseInt(qtyInput.value, 10) || 1;
    qty = Math.max(1, Math.min(qty, currentProduct.stock));
    qtyInput.value = qty;
    selectedQty = qty;
    linePreview.textContent = formatPrice(currentProduct.price * qty);
  }

  document.getElementById("qtyMinus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    updatePreview();
  });
  document.getElementById("qtyPlus").addEventListener("click", () => {
    qtyInput.value = (parseInt(qtyInput.value, 10) || 1) + 1;
    updatePreview();
  });
  qtyInput.addEventListener("input", updatePreview);

  // ----- colour -----
  wrap.querySelectorAll(".pd-color").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedColor = btn.dataset.color;
      wrap.querySelectorAll(".pd-color").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      document.getElementById("pdColorName").textContent = selectedColor;
    });
  });

  // ----- buying -----
  document.getElementById("addToCartBtn").addEventListener("click", () => {
    CartDB.add(currentProduct.id, selectedQty, selectedColor);
    updateCartBadge();
    const btn = document.getElementById("addToCartBtn");
    const original = btn.textContent;
    btn.textContent = "Added to cart ✓";
    setTimeout(() => (btn.textContent = original), 1200);
  });

  // Buy now adds this item and goes straight to checkout.
  // Checkout asks the visitor to sign in first if needed.
  document.getElementById("buyNowBtn").addEventListener("click", () => {
    CartDB.add(currentProduct.id, selectedQty, selectedColor);
    window.location.href = "checkout.html";
  });
}

/* Shows the description clamped to 3 lines. The "More" button appears
   only when the text is actually longer than 3 lines at this width. */
function setupDescription() {
  const desc = document.getElementById("pdDesc");
  const toggle = document.getElementById("pdDescToggle");
  if (!desc || !toggle) return;

  const expanded = toggle.dataset.expanded === "true";
  desc.classList.toggle("is-clamped", !expanded);
  const overflows = desc.scrollHeight > desc.clientHeight + 1;
  toggle.hidden = !overflows && !expanded;
  toggle.textContent = expanded ? "Less" : "More";
  if (!overflows && !expanded) desc.classList.remove("is-clamped");
}

function bindDescriptionToggle() {
  const toggle = document.getElementById("pdDescToggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    toggle.dataset.expanded = toggle.dataset.expanded === "true" ? "false" : "true";
    setupDescription();
  });
}

whenReady(() => {
  renderHeader();
  renderFooter();
  renderProduct();
  setupDescription();
  bindDescriptionToggle();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupDescription, 150);
  });
});
