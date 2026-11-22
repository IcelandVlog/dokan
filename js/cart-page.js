/* ============================================================
   DOKAN — cart-page.js
   ============================================================ */

function cartRow(item) {
  return `
    <div class="cart-row" data-id="${escapeHtml(item.key)}">
      <img src="${item.product.image}" alt="${escapeHtml(item.product.name)}" />
      <div class="cart-row-info">
        <a href="product.html?id=${item.productId}"><h3>${escapeHtml(item.product.name)}</h3></a>
        <p class="muted">${escapeHtml(item.product.category)}${item.color ? ` · Colour: ${escapeHtml(item.color)}` : ""} · ${formatPrice(item.product.price)} each</p>
      </div>
      <div class="qty-stepper qty-stepper-sm">
        <button data-action="minus">−</button>
        <input type="number" min="1" max="${item.product.stock}" value="${item.qty}" data-action="input" />
        <button data-action="plus">+</button>
      </div>
      <div class="cart-row-total">${formatPrice(item.lineTotal)}</div>
      <button class="icon-btn remove-btn" data-action="remove" title="Remove">✕</button>
    </div>
  `;
}

function renderCart() {
  const items = CartDB.detailedItems();
  const list = document.getElementById("cartList");
  const empty = document.getElementById("cartEmpty");
  const summary = document.getElementById("cartSummary");

  if (!items.length) {
    list.innerHTML = "";
    empty.style.display = "block";
    summary.style.display = "none";
    return;
  }

  empty.style.display = "none";
  summary.style.display = "block";
  list.innerHTML = items.map(cartRow).join("");

  document.getElementById("itemCount").textContent = items.reduce((s, i) => s + i.qty, 0);
  document.getElementById("cartTotal").textContent = formatPrice(CartDB.total());

  list.querySelectorAll(".cart-row").forEach((row) => {
    const id = row.dataset.id;
    const input = row.querySelector('[data-action="input"]');

    row.querySelector('[data-action="minus"]').addEventListener("click", () => {
      CartDB.updateQty(id, Math.max(1, parseInt(input.value, 10) - 1));
      renderCart();
      updateCartBadge();
    });
    row.querySelector('[data-action="plus"]').addEventListener("click", () => {
      CartDB.updateQty(id, parseInt(input.value, 10) + 1);
      renderCart();
      updateCartBadge();
    });
    input.addEventListener("change", () => {
      const qty = Math.max(1, parseInt(input.value, 10) || 1);
      CartDB.updateQty(id, qty);
      renderCart();
      updateCartBadge();
    });
    row.querySelector('[data-action="remove"]').addEventListener("click", () => {
      CartDB.remove(id);
      renderCart();
      updateCartBadge();
    });
  });
}

whenReady(() => {
  renderHeader({ showSearch: false });
  renderFooter();
  renderCart();

  document.getElementById("checkoutBtn").addEventListener("click", () => {
    const user = SessionDB.currentUser();
    if (!user) {
      window.location.href = "login.html?redirect=checkout.html";
      return;
    }
    window.location.href = "checkout.html";
  });
});
