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
        <button type="button" class="search-clear" id="searchClear" aria-label="Clear search" hidden>×</button>
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
              ${user.role === "admin" ? `<a href="admin.html">Admin panel</a>` : user.role === "seller" ? `<a href="seller.html">My shop</a>` : `<a href="orders.html">My orders</a>`}
              <button id="logoutBtn">Sign out</button>
            </div>
          ` : `
            <a class="btn btn-outline btn-sm" href="login.html">Sign in</a>
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
    const clearBtn = document.getElementById("searchClear");
    if (params.get("q")) searchInput.value = params.get("q");

    const syncClear = () => {
      clearBtn.hidden = searchInput.value === "";
    };
    const runSearch = (value) => {
      syncClear();
      if (typeof onSearchInput === "function") onSearchInput(value);
    };

    syncClear();
    searchInput.addEventListener("input", (e) => runSearch(e.target.value));
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      runSearch("");
      searchInput.focus();
    });
  }
}

function renderFooter() {
  const mount = document.getElementById("siteFooter");
  if (!mount) return;
  // Signed-in visitors don't need the Sign in link; the Admin link is also
  // hidden for them (admins already have it in the header account menu).
  const signedIn = Boolean(SessionDB.currentUser());
  mount.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="logo-mark">দ</span> Dokan
        <p>A small shop, built to be clicked around in. Everything here is a demo — no real payments are made.</p>
      </div>
      <div class="footer-links">
        <a href="index.html">Home</a>
        <a href="cart.html">Cart</a>
        <a href="apply.html">Sell on Dokan</a>
        ${signedIn ? "" : `<a href="login.html">Sign in</a>`}
        ${signedIn ? "" : `<a href="admin.html">Admin</a>`}
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

/* Centred confirmation popup. Resolves true for OK, false for Cancel, Esc or a click outside. */
function confirmDialog(message, { okText = "OK", cancelText = "Cancel", danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "dk-modal-backdrop";
    overlay.innerHTML = `
      <div class="dk-modal" role="alertdialog" aria-modal="true" aria-labelledby="dkModalMsg">
        <p class="dk-modal-msg" id="dkModalMsg"></p>
        <div class="dk-modal-actions">
          <button type="button" class="btn btn-outline" data-cancel>${escapeHtml(cancelText)}</button>
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${escapeHtml(okText)}</button>
        </div>
      </div>`;
    overlay.querySelector("#dkModalMsg").textContent = message;

    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
    };

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish(false);
    });
    overlay.querySelector("[data-cancel]").addEventListener("click", () => finish(false));
    overlay.querySelector("[data-ok]").addEventListener("click", () => finish(true));
    document.addEventListener("keydown", onKey);

    document.body.appendChild(overlay);
    overlay.querySelector("[data-ok]").focus();
  });
}

/* Colours are stored as "Name|#hex" (or just "Name" for older entries). */
function encodeColour(c) {
  return c.hex ? `${c.name}|${c.hex}` : c.name;
}
function decodeColour(value) {
  const [name, hex] = String(value).split("|");
  return { name: (name || "").trim(), hex: (hex || "").trim() };
}

/* Item name for order lists, with its colour when there is one. */
function itemName(item) {
  return escapeHtml(item.name) + (item.color ? ` <span class="muted">(${escapeHtml(item.color)})</span>` : "");
}

/* Taka price with thousands separators, e.g. ৳15,000.00 */
function formatPrice(n) {
  return (
    "৳" +
    Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/* ---------- rich product details ----------
   Admins paste formatted text (headings, bullets, bold) into the
   description box. We keep only a small set of safe tags and drop
   everything else (scripts, styles, images, inline styles, links). */
const RICH_ALLOWED_TAGS = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U",
  "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6",
]);
const RICH_DROP_TAGS = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "IMG", "VIDEO", "AUDIO",
  "SVG", "TEMPLATE", "NOSCRIPT", "META", "LINK", "INPUT", "BUTTON", "SELECT", "TEXTAREA",
]);

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ""}</body>`, "text/html");
  const out = document.createElement("div");

  const walk = (source, target) => {
    Array.from(source.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        target.appendChild(document.createTextNode(child.textContent));
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const tag = child.tagName.toUpperCase();
      if (RICH_DROP_TAGS.has(tag)) return;

      if (tag === "DIV" && target.tagName !== "P") {
        // Pasted content often wraps lines in <div>; treat each as a paragraph.
        const p = document.createElement("p");
        walk(child, p);
        if (p.textContent.trim() || p.querySelector("br")) target.appendChild(p);
        return;
      }

      if (RICH_ALLOWED_TAGS.has(tag)) {
        const el = document.createElement(tag.toLowerCase());
        walk(child, el);
        target.appendChild(el);
        return;
      }

      // Anything else (span, font, a, section, ...): keep its text, drop the wrapper.
      walk(child, target);
    });
  };

  walk(doc.body, out);
  return out.innerHTML.trim();
}

/* Turns a stored description into safe HTML for display.
   Old plain-text descriptions keep their line breaks. */
function descriptionHtml(value) {
  const text = value || "";
  if (/<[a-z][\s\S]*>/i.test(text)) return sanitizeHtml(text);
  return escapeHtml(text).replace(/\n/g, "<br>");
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
