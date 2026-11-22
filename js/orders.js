/* ============================================================
   DOKAN — orders.js (customer order history)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("orders.html");
  if (!user) return;

  renderHeader({ showSearch: false });
  renderFooter();

  const orders = OrdersDB.byUser(user.email).reverse();
  const wrap = document.getElementById("ordersList");

  if (!orders.length) {
    wrap.innerHTML = `<div class="empty-state">
      <p>No orders yet.</p>
      <a class="btn btn-primary" href="index.html">Start shopping</a>
    </div>`;
    return;
  }

  wrap.innerHTML = orders
    .map(
      (o) => `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <strong>${o.id}</strong>
          <p class="muted">${new Date(o.date).toLocaleString()}</p>
        </div>
        <span class="status-pill">${escapeHtml(o.status)}</span>
      </div>
      <div class="order-card-items">
        ${o.items.map((i) => `<div class="summary-row"><span>${escapeHtml(i.name)} <span class="muted">× ${i.qty}</span></span><span>${formatPrice(i.lineTotal)}</span></div>`).join("")}
      </div>
      <div class="order-card-total">Total: <strong>${formatPrice(o.total)}</strong></div>
    </div>`
    )
    .join("");
});
