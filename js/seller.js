/* ============================================================
   DOKAN — seller.js (seller dashboard)
   A seller can add, edit and remove only their own products.
   The database policies enforce that too.
   ============================================================ */

let sellerUser = null;
let sellerEditingId = null;

function mySellerProducts() {
  return ProductsDB.all().filter((p) => p.sellerId === sellerUser.id);
}

function renderSellerProducts() {
  const list = document.getElementById("sellerProductList");
  const items = mySellerProducts();
  if (!items.length) {
    list.innerHTML = `<p class="muted">You haven't added any products yet. Use the form to add your first one.</p>`;
    return;
  }
  list.innerHTML = items
    .map(
      (p) => `
      <div class="admin-user-card seller-product">
        <div class="seller-product-row">
          <img src="${escapeHtml(p.image)}" alt="" />
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <p class="muted">${escapeHtml(p.category)} · ${formatPrice(p.price)} · ${p.stock} in stock</p>
          </div>
          <div class="row-actions">
            <button class="btn btn-outline btn-sm" data-edit="${escapeHtml(p.id)}">Edit</button>
            <button class="btn btn-outline btn-sm" data-delete="${escapeHtml(p.id)}">Delete</button>
          </div>
        </div>
      </div>`
    )
    .join("");

  list.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => startEdit(btn.dataset.edit))
  );
  list.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const ok = await confirmDialog("Remove this product from the shop?", { okText: "Delete", danger: true });
      if (!ok) return;
      ProductsDB.remove(btn.dataset.delete);
      if (sellerEditingId === btn.dataset.delete) resetForm();
      renderSellerProducts();
    })
  );
}

function showMessage(text, isError = false) {
  const msg = document.getElementById("sellerMsg");
  msg.textContent = text;
  msg.style.color = isError ? "#C0533E" : "";
  msg.style.display = "block";
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => (msg.style.display = "none"), 2200);
}

function startEdit(id) {
  const p = ProductsDB.find(id);
  if (!p) return;
  sellerEditingId = id;
  document.getElementById("spName").value = p.name;
  document.getElementById("spCategory").value = p.category;
  document.getElementById("spBrand").value = p.brand || "";
  document.getElementById("spPrice").value = p.price;
  document.getElementById("spStock").value = p.stock;
  document.getElementById("spImage").value = p.images[0] || "";
  document.getElementById("spExtraImages").value = p.images.slice(1).join("\n");
  document.getElementById("spDescription").value = descriptionToText(p.description);
  document.getElementById("sellerFormTitle").textContent = "Edit product";
  document.getElementById("sellerSubmit").textContent = "Save changes";
  document.getElementById("sellerCancel").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  sellerEditingId = null;
  document.getElementById("sellerForm").reset();
  document.getElementById("sellerFormTitle").textContent = "Add a product";
  document.getElementById("sellerSubmit").textContent = "Add product";
  document.getElementById("sellerCancel").hidden = true;
}

whenReady(() => {
  sellerUser = requireSeller();
  if (!sellerUser) return;
  renderHeader({ showSearch: false });
  renderFooter();

  const datalist = document.getElementById("spCategoryList");
  ProductsDB.categories().forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    datalist.appendChild(opt);
  });

  renderSellerProducts();
  document.getElementById("sellerCancel").addEventListener("click", resetForm);

  document.getElementById("sellerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = (id) => document.getElementById(id).value.trim();
    const price = parseFloat(document.getElementById("spPrice").value);
    const stock = parseInt(document.getElementById("spStock").value, 10);
    if (!(price >= 0) || !(stock >= 0)) {
      showMessage("Price and stock must be zero or more.", true);
      return;
    }

    const extra = document
      .getElementById("spExtraImages")
      .value.split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const main = val("spImage") || `https://picsum.photos/seed/dokan-${Date.now()}/600/600`;
    const fields = {
      name: val("spName"),
      category: val("spCategory"),
      brand: val("spBrand"),
      price,
      stock,
      images: [main, ...extra],
      image: main,
      description: document.getElementById("spDescription").value.trim(),
    };

    if (sellerEditingId) {
      ProductsDB.update(sellerEditingId, fields);
      showMessage("Product updated ✓");
    } else {
      ProductsDB.add({ ...fields, comparePrice: null, colors: [], sellerId: sellerUser.id });
      showMessage("Product added ✓");
    }
    resetForm();
    renderSellerProducts();
    populateDatalistIfNeeded();
  });
});

function populateDatalistIfNeeded() {
  const datalist = document.getElementById("spCategoryList");
  const known = [...datalist.options].map((o) => o.value);
  ProductsDB.categories().forEach((c) => {
    if (!known.includes(c)) {
      const opt = document.createElement("option");
      opt.value = c;
      datalist.appendChild(opt);
    }
  });
}

/* Turns a stored description back into plain text for the textarea. */
function descriptionToText(stored) {
  const withBreaks = String(stored || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6])>/gi, "\n");
  return new DOMParser().parseFromString(withBreaks, "text/html").body.textContent.trim();
}
