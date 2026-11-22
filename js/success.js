/* ============================================================
   DOKAN — success.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  renderHeader({ showSearch: false });
  renderFooter();

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId") || localStorage.getItem("dokan_last_order_id");
  const order = orderId ? OrdersDB.find(orderId) : null;

  const wrap = document.getElementById("successDetail");
  if (!order) {
    wrap.innerHTML = `<p>We couldn't find that order.</p>`;
    return;
  }

  wrap.innerHTML = `
    <p class="order-id">Order <strong>${order.id}</strong></p>
    <div class="summary-card">
      ${order.items
        .map(
          (i) => `<div class="summary-row"><span>${escapeHtml(i.name)} <span class="muted">× ${i.qty}</span></span><span>${formatPrice(i.lineTotal)}</span></div>`
        )
        .join("")}
      <div class="summary-row summary-row-total"><span>Total paid</span><span>${formatPrice(order.total)}</span></div>
    </div>
    <div class="ship-to">
      <h3>Shipping to</h3>
      <p>${escapeHtml(order.customerName)}<br>${escapeHtml(order.address)}<br>${escapeHtml(order.phone)}</p>
      <p class="muted">Payment method: ${escapeHtml(order.paymentMethod)}</p>
    </div>
  `;
});
