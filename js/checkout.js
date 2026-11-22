/* ============================================================
   DOKAN — checkout.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("checkout.html");
  if (!user) return;

  renderHeader({ showSearch: false });
  renderFooter();

  const items = CartDB.detailedItems();
  if (!items.length) {
    window.location.href = "cart.html";
    return;
  }

  document.getElementById("checkoutName").value = user.name;

  const summaryList = document.getElementById("summaryList");
  summaryList.innerHTML = items
    .map(
      (i) => `
      <div class="summary-row">
        <span>${escapeHtml(i.product.name)} <span class="muted">× ${i.qty}</span></span>
        <span>${formatPrice(i.lineTotal)}</span>
      </div>`
    )
    .join("");

  const total = CartDB.total();
  document.getElementById("summaryTotal").textContent = formatPrice(total);

  document.getElementById("checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const order = OrdersDB.create({
      userEmail: user.email,
      customerName: document.getElementById("checkoutName").value.trim(),
      phone: document.getElementById("checkoutPhone").value.trim(),
      address: document.getElementById("checkoutAddress").value.trim(),
      paymentMethod: document.getElementById("checkoutPayment").value,
      items: items.map((i) => ({
        productId: i.productId,
        name: i.product.name,
        price: i.product.price,
        qty: i.qty,
        lineTotal: i.lineTotal,
      })),
      total,
    });

    CartDB.clear();
    localStorage.setItem("dokan_last_order_id", order.id);
    window.location.href = "success.html?orderId=" + order.id;
  });
});
