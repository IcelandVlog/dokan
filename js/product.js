/* ============================================================
   DOKAN — product.js (product detail page)
   ============================================================ */

let currentProduct = null;
let selectedQty = 1;

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

  wrap.innerHTML = `
    <div class="product-detail-image">
      <img src="${currentProduct.image}" alt="${escapeHtml(currentProduct.name)}" />
    </div>
    <div class="product-detail-info">
      <span class="badge-category">${escapeHtml(currentProduct.category)}</span>
      <h1>${escapeHtml(currentProduct.name)}</h1>
      <p class="product-detail-price" id="unitPrice">${formatPrice(currentProduct.price)}</p>
      <p class="product-detail-desc">${escapeHtml(currentProduct.description)}</p>
      <p class="stock-note">${currentProduct.stock > 0 ? `${currentProduct.stock} in stock` : "Out of stock"}</p>

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

      <button class="btn btn-primary btn-lg btn-block" id="addToCartBtn" ${currentProduct.stock === 0 ? "disabled" : ""}>
        Add to cart
      </button>
      <a class="btn btn-outline btn-block" href="index.html">← Continue browsing</a>
    </div>
  `;

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

  document.getElementById("addToCartBtn").addEventListener("click", () => {
    CartDB.add(currentProduct.id, selectedQty);
    updateCartBadge();
    const btn = document.getElementById("addToCartBtn");
    const original = btn.textContent;
    btn.textContent = "Added to cart ✓";
    setTimeout(() => (btn.textContent = original), 1200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
  renderProduct();
});
