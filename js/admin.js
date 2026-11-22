/* ============================================================
   DOKAN — admin.js
   The admin panel needs a signed-in Supabase account whose profile
   role is "admin". The database policies enforce the same rule.
   ============================================================ */

const ADMIN_PAGE_SIZE = 10;

/* ---------- colour picker ----------
   Admin picks colours from swatches, or adds a custom name + colour.
   The picked list lives in a hidden input as JSON, so the form can read it on save. */
const COLOUR_PRESETS = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Grey", hex: "#7F8C8D" },
  { name: "Red", hex: "#C0392B" },
  { name: "Orange", hex: "#E67E22" },
  { name: "Yellow", hex: "#F1C40F" },
  { name: "Green", hex: "#2E8B57" },
  { name: "Blue", hex: "#2E6DB4" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "Pink", hex: "#E88EA8" },
  { name: "Brown", hex: "#8B5A2B" },
];

/* Escapes a value for use inside an HTML attribute, including quotes. */
function attr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function colourPickerHtml(selected) {
  const picked = selected.map(decodeColour);
  const isPicked = (name) => picked.some((c) => c.name.toLowerCase() === name.toLowerCase());

  const swatches = COLOUR_PRESETS.map(
    (c) => `<button type="button" class="swatch ${isPicked(c.name) ? "is-on" : ""}" style="background:${c.hex}"
              data-swatch="${attr(c.name + "|" + c.hex)}" title="${attr(c.name)}" aria-label="${attr(c.name)}"></button>`
  ).join("");

  const chips = picked
    .map(
      (c) => `<span class="colour-chip"><i style="background:${attr(c.hex || "#888888")}"></i>${escapeHtml(c.name)}
                <button type="button" data-remove-colour="${attr(c.name)}" aria-label="Remove ${attr(c.name)}">×</button></span>`
    )
    .join("");

  return `
    <div class="colour-picker" data-colour-picker>
      <div class="swatch-row">${swatches}</div>
      <div class="colour-custom">
        <input type="text" data-custom-name placeholder="Custom colour name" />
        <input type="color" data-custom-hex value="#888888" aria-label="Pick a colour" />
        <button type="button" class="btn btn-outline btn-sm" data-add-custom>Add</button>
      </div>
      <div class="colour-chips">${chips || `<span class="muted">No colours yet (optional)</span>`}</div>
      <input type="hidden" data-colours-value value="${attr(JSON.stringify(picked.map(encodeColour)))}" />
    </div>`;
}

function currentColours(picker) {
  return JSON.parse(picker.querySelector("[data-colours-value]").value || "[]");
}

/* Colours chosen inside a container (a form, or the add-product box). */
function pickerColours(root) {
  const picker = root.matches("[data-colour-picker]") ? root : root.querySelector("[data-colour-picker]");
  return picker ? currentColours(picker) : [];
}

function setColours(picker, list) {
  const tpl = document.createElement("template");
  tpl.innerHTML = colourPickerHtml(list).trim();
  picker.replaceWith(tpl.content.firstElementChild);
}

document.addEventListener("click", (e) => {
  const picker = e.target.closest("[data-colour-picker]");
  if (!picker) return;
  const list = currentColours(picker);
  const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

  const swatch = e.target.closest("[data-swatch]");
  if (swatch) {
    const [name, hex] = swatch.dataset.swatch.split("|");
    const already = list.map(decodeColour).some((c) => sameName(c.name, name));
    const next = already
      ? list.filter((v) => !sameName(decodeColour(v).name, name))
      : [...list, encodeColour({ name, hex })];
    return setColours(picker, next);
  }

  const remove = e.target.closest("[data-remove-colour]");
  if (remove) {
    return setColours(picker, list.filter((v) => decodeColour(v).name !== remove.dataset.removeColour));
  }

  if (e.target.closest("[data-add-custom]")) {
    const name = picker.querySelector("[data-custom-name]").value.trim();
    const hex = picker.querySelector("[data-custom-hex]").value;
    if (!name) return alert("Type a name for the custom colour.");
    if (list.map(decodeColour).some((c) => sameName(c.name, name))) return alert("That colour is already added.");
    return setColours(picker, [...list, encodeColour({ name, hex })]);
  }
});

let adminTab = "products";
let expandedUserEmail = null;
let productsPage = 1;
let usersPage = 1;
let ordersPage = 1;

/* ---------- gate ----------
   The panel opens only for a signed-in Supabase user whose profile
   role is "admin". Anyone else sees the sign-in form. */
function isAdminSignedIn() {
  const user = SessionDB.currentUser();
  return !!user && user.role === "admin";
}

function showGate(message) {
  document.getElementById("adminGate").style.display = "block";
  document.getElementById("adminContent").style.display = "none";
  const errorBox = document.getElementById("gateError");
  if (message) {
    errorBox.textContent = message;
    errorBox.style.display = "block";
  }
}

function showAdminContent() {
  document.getElementById("adminGate").style.display = "none";
  document.getElementById("adminContent").style.display = "block";
  switchTab(adminTab);
}

function initAdminGate() {
  if (isAdminSignedIn()) {
    showAdminContent();
  } else {
    showGate();
  }

  document.getElementById("gateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("gateEmail").value.trim();
    const password = document.getElementById("gatePassword").value;
    const errorBox = document.getElementById("gateError");
    const submitBtn = e.target.querySelector("[type=submit]");
    submitBtn.disabled = true;
    errorBox.style.display = "none";

    try {
      const result = await login({ email, password });
      if (!result.ok) {
        showGate(result.message);
      } else if (result.user.role !== "admin") {
        await sb.auth.signOut();
        cache.currentUser = null;
        showGate("This account is not an admin account.");
      } else {
        document.getElementById("gatePassword").value = "";
        showAdminContent();
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  const lockBtn = document.getElementById("lockAdminBtn");
  if (lockBtn) {
    lockBtn.addEventListener("click", async () => {
      await sb.auth.signOut();
      cache.currentUser = null;
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
  if (tab === "sellers") renderSellerRequests();
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
let editingProductId = null;

function productEditFormHtml(p) {
  const categories = ProductsDB.categories();
  return `
    <form class="admin-row" data-edit-form="${p.id}" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field">
        <label>Name</label>
        <input name="name" required value="${escapeHtml(p.name)}" />
      </div>
      <div class="field">
        <label>Category</label>
        <input name="category" required list="categoryOptions" value="${escapeHtml(p.category)}" />
        <datalist id="categoryOptions">${categories.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("")}</datalist>
      </div>
      <div class="field">
        <label>Price (BDT ৳)</label>
        <input name="price" type="number" step="0.01" min="0" required value="${p.price}" />
      </div>
      <div class="field">
        <label>Stock</label>
        <input name="stock" type="number" step="1" min="0" required value="${p.stock}" />
      </div>
      <div class="field">
        <label>Brand</label>
        <input name="brand" value="${escapeHtml(p.brand || "")}" />
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Colours (optional)</label>
        ${colourPickerHtml(p.colors || [])}
      </div>
      <div class="field">
        <label>Original price (optional)</label>
        <input name="comparePrice" type="number" step="0.01" min="0" value="${p.comparePrice ?? ""}" />
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Images (one URL per line, first is the main image)</label>
        <textarea name="images" rows="3">${escapeHtml((p.images && p.images.length ? p.images : [p.image]).join("\n"))}</textarea>
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Description</label>
        <div class="rich-editor" data-rich contenteditable="true">${descriptionHtml(p.description)}</div>
      </div>
      <div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-outline btn-sm" data-cancel-edit>Cancel</button>
        <button type="submit" class="btn btn-primary btn-sm">Save changes</button>
      </div>
    </form>`;
}

function renderAdminProducts() {
  const list = document.getElementById("adminProductList");
  const all = ProductsDB.all();
  const { pageItems, totalPages, currentPage } = paginate(all, productsPage, ADMIN_PAGE_SIZE);
  productsPage = currentPage;

  list.innerHTML = pageItems
    .map((p) => {
      if (p.id === editingProductId) return productEditFormHtml(p);
      return `
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
      <div class="row-actions">
        <button class="btn btn-outline btn-sm" data-edit="${p.id}">Edit</button>
        <button class="btn btn-outline btn-sm" data-delete="${p.id}">Delete</button>
      </div>
    </div>`;
    })
    .join("");

  list.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingProductId = btn.dataset.edit;
      renderAdminProducts();
    });
  });

  list.querySelectorAll("[data-cancel-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingProductId = null;
      renderAdminProducts();
    });
  });

  list.querySelectorAll("[data-edit-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = form.dataset.editForm;
      const current = ProductsDB.find(id);
      if (!current) return;

      const fd = new FormData(form);
      const name = String(fd.get("name")).trim();
      const category = String(fd.get("category")).trim();
      const price = Math.round(parseFloat(fd.get("price")) * 100) / 100;
      const stock = parseInt(fd.get("stock"), 10);
      const images = String(fd.get("images"))
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const brand = String(fd.get("brand")).trim();
      const comparePriceRaw = parseFloat(fd.get("comparePrice"));
      const descBox = form.querySelector("[data-rich]");
      const description = sanitizeHtml(descBox.innerHTML);
      if (!descBox.textContent.trim()) return alert("Description is required.");

      if (!name || !category) return alert("Name and category are required.");
      if (!(price >= 0)) return alert("Price must be 0 or more.");
      if (!(stock >= 0)) return alert("Stock must be 0 or more.");
      if (comparePriceRaw && !(comparePriceRaw > price)) {
        return alert("The original price must be higher than the sale price.");
      }

      ProductsDB.update(id, {
        name,
        category,
        brand,
        price,
        comparePrice: comparePriceRaw || null,
        colors: pickerColours(form),
        stock,
        images: images.length ? images : current.images,
        description,
      });
      editingProductId = null;
      populateCategorySelect();
      renderAdminProducts();
    });
  });

  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await confirmDialog("Remove this product from the shop?", {
        okText: "Delete",
        danger: true,
      });
      if (ok) {
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
        ${o.items.map((i) => `<div class="summary-row"><span>${itemName(i)} <span class="muted">× ${i.qty}</span></span><span>${formatPrice(i.lineTotal)}</span></div>`).join("")}
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
whenReady(() => {
  renderHeader({ showSearch: false });
  renderFooter();
  initAdminGate();
  populateCategorySelect();
  document.getElementById("newColourPicker").innerHTML = colourPickerHtml([]);

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
    const descBox = document.getElementById("newDescription");
    const description = sanitizeHtml(descBox.innerHTML);

    if (!descBox.textContent.trim()) {
      alert("Please add a description.");
      return;
    }
    if (!category) {
      alert("Please choose or type a category.");
      return;
    }

    const brand = document.getElementById("newBrand").value.trim();
    const comparePriceRaw = parseFloat(document.getElementById("newComparePrice").value);
    if (comparePriceRaw && !(comparePriceRaw > price)) {
      alert("The original price must be higher than the sale price.");
      return;
    }
    const extraImages = document
      .getElementById("newExtraImages")
      .value.split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    ProductsDB.add({
      name,
      category,
      brand,
      colors: pickerColours(document.getElementById("newColourPicker")),
      price,
      comparePrice: comparePriceRaw || null,
      stock,
      images: [image, ...extraImages],
      description,
    });
    e.target.reset();
    document.getElementById("newDescription").innerHTML = "";
    document.getElementById("newColourPicker").innerHTML = colourPickerHtml([]);
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
