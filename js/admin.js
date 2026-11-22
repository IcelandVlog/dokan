/* ============================================================
   DOKAN — admin.js
   The admin panel is gated by a shared access code instead of a
   regular user login. Once unlocked it stays unlocked on this
   device until "Lock panel" is pressed or storage is cleared.
   ============================================================ */

const ADMIN_PAGE_SIZE = 10;

let adminTab = "products";
let expandedUserEmail = null;
let productsPage = 1;
let usersPage = 1;
let ordersPage = 1;

/* ---------- gate ---------- */
function isAdminUnlocked() {
  return storageGet(DB_KEYS.ADMIN_GATE) === "granted";
}

function showGate() {
  document.getElementById("adminGate").style.display = "block";
  document.getElementById("adminContent").style.display = "none";
}

function showAdminContent() {
  document.getElementById("adminGate").style.display = "none";
  document.getElementById("adminContent").style.display = "block";
  switchTab(adminTab);
}

function initAdminGate() {
  if (isAdminUnlocked()) {
    showAdminContent();
  } else {
    showGate();
  }

  document.getElementById("gateForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("gateCode");
    const errorBox = document.getElementById("gateError");

    if (input.value.trim() === ADMIN_ACCESS_CODE) {
      storageSet(DB_KEYS.ADMIN_GATE, "granted");
      input.value = "";
      errorBox.style.display = "none";
      showAdminContent();
    } else {
      errorBox.textContent = "That code isn't right. Try again.";
      errorBox.style.display = "block";
    }
  });

  const lockBtn = document.getElementById("lockAdminBtn");
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      storageRemove(DB_KEYS.ADMIN_GATE);
      showGate();
    });
  }
}

/* ---------- tabs ---------- */
function switchTab(tab) {
  adminTab = tab;
  document.querySelectorAll(".admin-tab").forEach((btn) => btn.classList.toggle("chip-active", btn.dataset.tab === tab));
  document.querySelectorAll(".admin-panel").forEach((panel) => (panel.style.display = panel.dataset.panel === tab ? "block" : "none"));
  if (tab === "products") renderAdminProducts();
  if (tab === "users") renderAdminUsers();
  if (tab === "orders") renderAdminOrders();
}

/* ---------- category select ---------- */
function populateCategorySelect() {
  const select = document.getElementById("newCategorySelect");
  const categories = ProductsDB.categories();
  select.innerHTML =
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("") +
    `<option value="__new__">+ Add a new category…</option>`;

  const customWrap = document.getElementById("newCategoryCustomWrap");
  select.addEventListener("change", () => {
    customWrap.style.display = select.value === "__new__" ? "block" : "none";
  });
}

/* ---------- products ---------- */
function renderAdminProducts() {
  const list = document.getElementById("adminProductList");
  const all = ProductsDB.all();
  const { pageItems, totalPages, currentPage } = paginate(all, productsPage, ADMIN_PAGE_SIZE);
  productsPage = currentPage;

  list.innerHTML = pageItems
    .map(
      (p) => `
    <div class="admin-row">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" />
      <div class="admin-row-info">
        <strong>${escapeHtml(p.name)}</strong>
        <p class="muted">${escapeHtml(p.category)} · ${formatPrice(p.price)} · ${p.stock} in stock</p>
      </div>
      <div class="restock-control">
        <input type="number" min="1" value="10" class="restock-input" data-restock-input="${p.id}" aria-label="Amount to restock" />
        <button class="btn btn-outline btn-sm" data-restock="${p.id}">+ Stock</button>
      </div>
      <button class="btn btn-outline btn-sm" data-delete="${p.id}">Delete</button>
    </div>`
    )
    .join("");

  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("Remove this product from the shop?")) {
        ProductsDB.remove(btn.dataset.delete);
        renderAdminProducts();
      }
    });
  });

  list.querySelectorAll("[data-restock]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.restock;
      const input = list.querySelector(`[data-restock-input="${id}"]`);
      const amount = Math.max(1, parseInt(input.value, 10) || 0);
      ProductsDB.adjustStock(id, amount);
      renderAdminProducts();
    });
  });

  renderPaginationControls("productsPagination", totalPages, productsPage, (page) => {
    productsPage = page;
    renderAdminProducts();
  });
}

/* ---------- users (linked to their orders — a mini database view) ---------- */
function renderAdminUsers() {
  const list = document.getElementById("adminUserList");
  const allUsers = UsersDB.all();
  const { pageItems, totalPages, currentPage } = paginate(allUsers, usersPage, ADMIN_PAGE_SIZE);
  usersPage = currentPage;

  list.innerHTML = pageItems
    .map((u) => {
      const orders = OrdersDB.byUser(u.email);
      const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
      const isOpen = expandedUserEmail === u.email;

      return `
      <div class="admin-user-card">
        <div class="admin-user-row" data-toggle="${escapeHtml(u.email)}">
          <div class="admin-user-info">
            <strong>${escapeHtml(u.name)}</strong>
            <p class="muted">${escapeHtml(u.email)}</p>
          </div>
          <span class="status-pill">${escapeHtml(u.role)}</span>
          <div class="admin-user-stats">
            <span>${orders.length} order${orders.length === 1 ? "" : "s"}</span>
            <span>${formatPrice(totalSpent)} spent</span>
          </div>
          <button class="icon-btn" data-toggle-btn="${escapeHtml(u.email)}" title="View orders">${isOpen ? "▲" : "▼"}</button>
        </div>
        <div class="admin-user-orders" style="display:${isOpen ? "block" : "none"};">
          ${orders.length ? orders.map(orderCardHtml).join("") : `<p class="muted" style="padding:12px;">No orders placed yet.</p>`}
        </div>
      </div>`;
    })
    .join("");

  list.querySelectorAll("[data-toggle]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("[data-toggle-btn]")) return;
      const email = row.dataset.toggle;
      expandedUserEmail = expandedUserEmail === email ? null : email;
      renderAdminUsers();
    });
  });
  list.querySelectorAll("[data-toggle-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const email = btn.dataset.toggleBtn;
      expandedUserEmail = expandedUserEmail === email ? null : email;
      renderAdminUsers();
    });
  });

  renderPaginationControls("usersPagination", totalPages, usersPage, (page) => {
    usersPage = page;
    renderAdminUsers();
  });
}

/* ---------- orders ---------- */
function orderCardHtml(o) {
  const canConfirm = o.status === "Processing";
  return `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <strong>${o.id}</strong>
          <p class="muted">${escapeHtml(o.customerName)} · ${escapeHtml(o.userEmail)} · ${new Date(o.date).toLocaleString()}</p>
        </div>
        <span class="status-pill ${o.status === "Confirmed" ? "status-pill-confirmed" : ""}">${escapeHtml(o.status)}</span>
      </div>
      <div class="order-card-items">
        ${o.items.map((i) => `<div class="summary-row"><span>${escapeHtml(i.name)} <span class="muted">× ${i.qty}</span></span><span>${formatPrice(i.lineTotal)}</span></div>`).join("")}
      </div>
      <p class="muted">Ship to: ${escapeHtml(o.address)} · ${escapeHtml(o.phone)} · ${escapeHtml(o.paymentMethod || "")}</p>
      <div class="order-card-footer">
        <div class="order-card-total">Total: <strong>${formatPrice(o.total)}</strong></div>
        ${canConfirm ? `<button class="btn btn-primary btn-sm" data-confirm-order="${o.id}">Confirm order</button>` : ""}
      </div>
    </div>`;
}

function renderAdminOrders() {
  const list = document.getElementById("adminOrderList");
  const allOrders = OrdersDB.all().slice().reverse();
  const { pageItems, totalPages, currentPage } = paginate(allOrders, ordersPage, ADMIN_PAGE_SIZE);
  ordersPage = currentPage;

  if (!allOrders.length) {
    list.innerHTML = `<p class="muted">No orders placed yet.</p>`;
    renderPaginationControls("ordersPagination", 1, 1, () => {});
    return;
  }

  list.innerHTML = pageItems.map(orderCardHtml).join("");

  list.querySelectorAll("[data-confirm-order]").forEach((btn) => {
    btn.addEventListener("click", () => confirmOrder(btn.dataset.confirmOrder));
  });

  renderPaginationControls("ordersPagination", totalPages, ordersPage, (page) => {
    ordersPage = page;
    renderAdminOrders();
  });
}

function confirmOrder(orderId) {
  const order = OrdersDB.find(orderId);
  if (!order || order.status !== "Processing") return;

  order.items.forEach((item) => {
    ProductsDB.adjustStock(item.productId, -item.qty);
  });
  OrdersDB.updateStatus(orderId, "Confirmed");

  // Re-render whichever tab is visible so stock/status stay in sync everywhere
  if (adminTab === "orders") renderAdminOrders();
  if (adminTab === "users") renderAdminUsers();
  if (adminTab === "products") renderAdminProducts();
}

/* ---------- add product ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderHeader({ showSearch: false });
  renderFooter();
  initAdminGate();
  populateCategorySelect();

  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("addProductForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newName").value.trim();

    const select = document.getElementById("newCategorySelect");
    const category =
      select.value === "__new__" ? document.getElementById("newCategoryCustom").value.trim() : select.value;

    const price = parseFloat(document.getElementById("newPrice").value);
    const stock = parseInt(document.getElementById("newStock").value, 10);
    const image = document.getElementById("newImage").value.trim() || `https://picsum.photos/seed/dokan-${Date.now()}/600/600`;
    const description = document.getElementById("newDescription").value.trim();

    if (!category) {
      alert("Please choose or type a category.");
      return;
    }

    ProductsDB.add({ name, category, price, stock, image, description });
    e.target.reset();
    document.getElementById("newCategoryCustomWrap").style.display = "none";
    populateCategorySelect();
    productsPage = 1;
    renderAdminProducts();

    const msg = document.getElementById("addProductMsg");
    msg.textContent = "Product added ✓";
    msg.style.display = "block";
    setTimeout(() => (msg.style.display = "none"), 1800);
  });
});
