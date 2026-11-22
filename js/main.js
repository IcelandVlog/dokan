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

/* Words that mean the same thing, so "television" finds "TV" products and vice versa. */
const SEARCH_SYNONYMS = {
  tv: ["television", "telly"],
  television: ["tv"],
  telly: ["tv"],
};

/* Plain text of a stored description. DOMParser does not run scripts or image loads. */
function plainText(html) {
  return new DOMParser().parseFromString(html || "", "text/html").body.textContent || "";
}

/* Every word typed must appear somewhere in the product's name, category,
   brand or details (or a synonym of it). */
function productMatchesSearch(p, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [p.name, p.category, p.brand, plainText(p.description)].join(" ").toLowerCase();
  return q.split(/\s+/).every((term) => {
    const options = [term, ...(SEARCH_SYNONYMS[term] || [])];
    return options.some((option) => haystack.includes(option));
  });
}

function getFilteredProducts() {
  const all = ProductsDB.all();
  return all.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesCategory && productMatchesSearch(p, searchTerm);
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

whenReady(() => {
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
