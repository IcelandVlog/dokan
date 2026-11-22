/* ============================================================
   DOKAN — components.js
   Renders the shared header (logo, search, theme toggle, cart,
   account menu) and footer into every page so markup isn't
   duplicated across HTML files.
   ============================================================ */

function renderHeader({ showSearch = true } = {}) {
  showStorageWarning();

  const mount = document.getElementById("siteHeader");
  if (!mount) return;

  const user = SessionDB.currentUser();
  const cartCount = CartDB.itemCount();

  mount.innerHTML = `
    <div class="header-inner">
      <a class="logo" href="index.html">
        <span class="logo-mark">দো</span>
        <span class="logo-word">Dokan</span>
      </a>

      ${showSearch ? `
      <div class="header-search">
        <input type="text" id="searchInput" placeholder="Search products…" autocomplete="off" />
        <span class="search-icon">⌕</span>
      </div>` : `<div class="header-search header-search--spacer"></div>`}

      <div class="header-actions">
        <button class="icon-btn" id="themeToggle" title="Toggle dark / light mode" aria-label="Toggle theme">
          <span id="themeIcon">${document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙"}</span>
        </button>

        <a class="icon-btn cart-btn" href="cart.html" title="Cart" aria-label="Cart">
          🛒
          <span class="cart-badge" id="cartBadge">${cartCount}</span>
        </a>

        <div class="account-menu">
          ${user ? `
            <button class="icon-btn account-btn" id="accountBtn" title="Account">
              👤 <span class="account-name">${escapeHtml(user.name.split(" ")[0])}</span>
            </button>
            <div class="account-dropdown" id="accountDropdown">
              <div class="account-dropdown-header">Signed in as<br><strong>${escapeHtml(user.email)}</strong></div>
              ${user.role === "admin" ? `<a href="admin.html">Admin panel</a>` : `<a href="orders.html">My orders</a>`}
              <button id="logoutBtn">Sign out</button>
            </div>
          ` : `
            <a class="btn btn-outline btn-sm" href="login.html">Sign in</a>
            <a class="btn btn-primary btn-sm" href="signup.html">Sign up</a>
          `}
        </div>
      </div>
    </div>
  `;

  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  if (user) {
    const accountBtn = document.getElementById("accountBtn");
    const dropdown = document.getElementById("accountDropdown");
    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
    document.addEventListener("click", () => dropdown.classList.remove("open"));
    document.getElementById("logoutBtn").addEventListener("click", logout);
  }

  if (showSearch) {
    const searchInput = document.getElementById("searchInput");
    const params = new URLSearchParams(window.location.search);
    if (params.get("q")) searchInput.value = params.get("q");
    searchInput.addEventListener("input", (e) => {
      if (typeof onSearchInput === "function") onSearchInput(e.target.value);
    });
  }
}

function renderFooter() {
  const mount = document.getElementById("siteFooter");
  if (!mount) return;
  mount.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="logo-mark">দ</span> Dokan
        <p>A small shop, built to be clicked around in. Everything here is a demo — no real payments are made.</p>
      </div>
      <div class="footer-links">
        <a href="index.html">Home</a>
        <a href="cart.html">Cart</a>
        <a href="login.html">Sign in</a>
        <a href="admin.html">Admin</a>
      </div>
    </div>
    <div class="footer-bottom">© ${new Date().getFullYear()} Dokan. Built for learning, not for launch.</div>
  `;
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (badge) badge.textContent = CartDB.itemCount();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatPrice(n) {
  return "$" + Number(n).toFixed(2);
}

/* ---------- reusable pagination ----------
   items: full array, page: current 1-based page, perPage: page size.
   Returns the slice for that page plus clamped page info. */
function paginate(items, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  return { pageItems: items.slice(start, start + perPage), totalPages, currentPage };
}

/* Renders numbered page buttons into #containerId and calls
   onChange(newPage) when the user picks one. Renders nothing (and
   clears the container) when everything fits on one page. */
function renderPaginationControls(containerId, totalPages, currentPage, onChange) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  if (totalPages <= 1) {
    wrap.innerHTML = "";
    return;
  }

  let html = `<button class="page-btn" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? "page-btn-active" : ""}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;
  wrap.innerHTML = html;

  wrap.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      let page = currentPage;
      if (btn.dataset.page === "prev") page = Math.max(1, currentPage - 1);
      else if (btn.dataset.page === "next") page = Math.min(totalPages, currentPage + 1);
      else page = parseInt(btn.dataset.page, 10);
      onChange(page);
    });
  });
}
