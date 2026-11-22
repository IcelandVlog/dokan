/* ============================================================
   DOKAN — main.js (home page)
   ============================================================ */

const PRODUCTS_PER_PAGE = 10;

let activeCategory = "All";
let searchTerm = "";
let currentPage = 1;

function productCard(product) {
  return `
    <a class="product-card" href="product.html?id=${product.id}">
      <span class="tag-hole"></span>
      <div class="product-card-image">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
        <span class="badge-category">${escapeHtml(product.category)}</span>
      </div>
      <div class="product-card-body">
        <h3>${escapeHtml(product.name)}</h3>
        <p class="product-price">${formatPrice(product.price)}</p>
        <button class="btn btn-primary btn-sm btn-block" data-add-id="${product.id}">Add to cart</button>
      </div>
    </a>
  `;
}

function getFilteredProducts() {
  const all = ProductsDB.all();
  return all.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = (p.name + " " + p.category).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  const filtered = getFilteredProducts();

  const { pageItems, totalPages, currentPage: clampedPage } = paginate(filtered, currentPage, PRODUCTS_PER_PAGE);
  currentPage = clampedPage;

  grid.innerHTML = pageItems.map(productCard).join("");
  empty.style.display = filtered.length ? "none" : "block";

  grid.querySelectorAll("[data-add-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      CartDB.add(btn.dataset.addId, 1);
      updateCartBadge();
      flashButton(btn);
    });
  });

  renderPaginationControls("pagination", totalPages, currentPage, (page) => {
    currentPage = page;
    renderProducts();
    window.scrollTo({ top: document.getElementById("productGrid").offsetTop - 100, behavior: "smooth" });
  });
}

function flashButton(btn) {
  const original = btn.textContent;
  btn.textContent = "Added ✓";
  btn.classList.add("btn-success");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("btn-success");
  }, 900);
}

function renderCategoryChips() {
  const wrap = document.getElementById("categoryChips");
  const categories = ["All", ...ProductsDB.categories()];
  wrap.innerHTML = categories
    .map((c) => `<button class="chip ${c === activeCategory ? "chip-active" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join("");
  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.category;
      currentPage = 1;
      renderCategoryChips();
      renderProducts();
    });
  });
}

function onSearchInput(value) {
  searchTerm = value;
  currentPage = 1;
  renderProducts();
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
  renderCategoryChips();
  renderProducts();

  const params = new URLSearchParams(window.location.search);
  if (params.get("q")) {
    searchTerm = params.get("q");
    currentPage = 1;
    renderProducts();
  }
});
