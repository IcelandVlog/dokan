/* ============================================================
   DOKAN — db.js
   Data layer backed by Supabase.

   On every page load we fetch products, orders, profiles and the
   current session from Supabase into an in-memory cache. The helper
   objects below (ProductsDB, OrdersDB, ...) read from that cache
   synchronously, so page code stays simple. Writes update the cache
   immediately and are then saved to Supabase.

   Cart, theme and the admin-panel gate stay in localStorage: they
   are per-device conveniences, not shared data.
   ============================================================ */

const DB_KEYS = {
  CART: "dokan_cart",
  THEME: "dokan_theme",
};

/* ---------- storage layer (localStorage for cart/theme/gate) ----------
   Some browsers (or file:// pages) block localStorage entirely.
   storageGet/Set fall back to an in-memory object so the app still
   renders — it just won't remember those settings across a refresh. */
const memoryStore = {};
let storageBlocked = false;

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    storageBlocked = true;
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }
}
function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    storageBlocked = true;
    memoryStore[key] = value;
  }
}
function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    storageBlocked = true;
    delete memoryStore[key];
  }
}

function showStorageWarning() {
  if (!storageBlocked) return;
  if (document.getElementById("storageWarning")) return;
  const bar = document.createElement("div");
  bar.id = "storageWarning";
  bar.style.cssText =
    "background:#C0533E;color:#fff;text-align:center;padding:10px 16px;font:600 13px/1.4 Inter,sans-serif;position:sticky;top:0;z-index:999;";
  bar.textContent =
    "Your browser is blocking local storage on this page (common when opening the file directly). Your cart and theme won't be saved between visits — run this through a local server (see README) to fix it.";
  document.body.prepend(bar);
}

/* ---------- Supabase cache ---------- */
const cache = {
  products: [],
  orders: [],
  users: [],
  currentUser: null,
};

/* Database rows use snake_case and numeric columns come back as
   strings, so convert them to the shape the page code expects. */
function toProduct(r) {
  const extra = Array.isArray(r.images) ? r.images.filter(Boolean) : [];
  const images = extra.length ? extra : r.image ? [r.image] : [];
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    brand: r.brand || "",
    price: Number(r.price),
    comparePrice: r.compare_price == null ? null : Number(r.compare_price),
    colors: Array.isArray(r.colors) ? r.colors.filter(Boolean) : [],
    stock: Number(r.stock),
    image: images[0] || "",
    images,
    description: r.description || "",
    sellerId: r.seller_id || null,
  };
}
function toProductRow(p) {
  const images = (p.images || []).filter(Boolean);
  if (!images.length && p.image) images.push(p.image);
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    brand: p.brand || null,
    price: p.price,
    compare_price: p.comparePrice || null,
    colors: p.colors || [],
    stock: p.stock,
    image: images[0] || null,
    images,
    description: p.description,
    seller_id: p.sellerId || null,
  };
}
function toOrder(r) {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email,
    customerName: r.customer_name,
    phone: r.phone,
    address: r.address,
    paymentMethod: r.payment_method,
    items: r.items || [],
    total: Number(r.total),
    status: r.status,
    date: r.created_at,
  };
}
function toUser(r) {
  return { id: r.id, name: r.name, email: r.email, role: r.role };
}

/* Re-reads the signed-in user's profile into the cache. */
async function refreshCurrentUser() {
  const { data: sessionData } = await sb.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    cache.currentUser = null;
    return;
  }
  const { data: profile, error } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  if (error) throw error;
  if (!profile) {
    cache.currentUser = null;
    return;
  }
  const user = toUser(profile);
  const i = cache.users.findIndex((u) => u.id === user.id);
  if (i >= 0) cache.users[i] = user;
  else cache.users.push(user);
  cache.currentUser = user;
}

/* Fetches everything the site needs. Runs once per page load. */
async function loadFromSupabase() {
  const [products, orders, profiles] = await Promise.all([
    sb.from("products").select("*").order("created_at", { ascending: false }),
    sb.from("orders").select("*").order("created_at", { ascending: true }),
    sb.from("profiles").select("*").order("created_at", { ascending: true }),
  ]);
  for (const res of [products, orders, profiles]) {
    if (res.error) throw new Error("Could not load data from Supabase: " + res.error.message);
  }
  cache.products = products.data.map(toProduct);
  cache.orders = orders.data.map(toOrder);
  cache.users = profiles.data.map(toUser);
  await refreshCurrentUser();
}

/* Pages wait on this before they render. */
const DokanReady = loadFromSupabase();

const domReady = new Promise((resolve) => {
  if (document.readyState !== "loading") resolve();
  else document.addEventListener("DOMContentLoaded", () => resolve());
});

/* Use instead of document.addEventListener("DOMContentLoaded", ...)
   so the page only runs once the Supabase data is in the cache. */
function whenReady(fn) {
  Promise.all([domReady, DokanReady]).then(() => fn());
}

/* Saves a write to Supabase. Cache is already updated, so the page
   doesn't wait; if the save fails we tell the user to reload. */
function persist(query, what) {
  return Promise.resolve(query)
    .then(({ error }) => {
      if (error) throw error;
    })
    .catch((err) => {
      console.error(`Dokan: could not save ${what}`, err);
      alert(`Couldn't save ${what} to Supabase: ${err.message}\nReload the page to see what is actually stored.`);
    });
}

/* ---------- generic helpers ---------- */
function readKey(key) {
  try {
    return JSON.parse(storageGet(key)) ?? [];
  } catch {
    return [];
  }
}
function writeKey(key, value) {
  storageSet(key, JSON.stringify(value));
}

/* ---------- products ---------- */
const ProductsDB = {
  all() {
    return cache.products.slice();
  },
  find(id) {
    return cache.products.find((p) => p.id === id) || null;
  },
  add(product) {
    const row = toProductRow({ ...product, id: "p" + Date.now() });
    const saved = toProduct(row);
    cache.products.unshift(saved); // newest product shows first
    persist(sb.from("products").insert(row), "the new product");
    return saved;
  },
  update(id, changes) {
    cache.products = cache.products.map((p) => (p.id === id ? { ...p, ...changes } : p));
    const updated = this.find(id);
    if (updated) persist(sb.from("products").update(toProductRow(updated)).eq("id", id), "product changes");
  },
  adjustStock(id, delta) {
    const product = this.find(id);
    if (!product) return;
    product.stock = Math.max(0, product.stock + delta);
    persist(sb.from("products").update({ stock: product.stock }).eq("id", id), "stock");
  },
  remove(id) {
    cache.products = cache.products.filter((p) => p.id !== id);
    persist(sb.from("products").delete().eq("id", id), "the product removal");
  },
  categories() {
    return [...new Set(cache.products.map((p) => p.category))];
  },
};

/* ---------- users (profiles) ---------- */
const UsersDB = {
  all() {
    return cache.users.slice();
  },
  findByEmail(email) {
    return cache.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
};

/* ---------- session (the signed-in profile) ---------- */
const SessionDB = {
  currentUser() {
    return cache.currentUser;
  },
};

/* ---------- cart (localStorage, per device) ---------- */
/* A cart line is one product in one colour. Plain products have no colour. */
function lineKey(item) {
  return item.color ? `${item.productId}::${item.color}` : item.productId;
}

const CartDB = {
  all() {
    return readKey(DB_KEYS.CART);
  },
  save(items) {
    writeKey(DB_KEYS.CART, items);
  },
  add(productId, qty = 1, color = "") {
    const cart = this.all();
    const existing = cart.find((i) => i.productId === productId && (i.color || "") === color);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ productId, color, qty });
    }
    this.save(cart);
  },
  updateQty(key, qty) {
    let cart = this.all();
    if (qty <= 0) {
      cart = cart.filter((i) => lineKey(i) !== key);
    } else {
      cart = cart.map((i) => (lineKey(i) === key ? { ...i, qty } : i));
    }
    this.save(cart);
  },
  remove(key) {
    this.save(this.all().filter((i) => lineKey(i) !== key));
  },
  clear() {
    this.save([]);
  },
  itemCount() {
    return this.all().reduce((sum, i) => sum + i.qty, 0);
  },
  detailedItems() {
    return this.all()
      .map((i) => {
        const product = ProductsDB.find(i.productId);
        if (!product) return null;
        return { ...i, key: lineKey(i), product, lineTotal: +(product.price * i.qty).toFixed(2) };
      })
      .filter(Boolean);
  },
  total() {
    return +this.detailedItems()
      .reduce((sum, i) => sum + i.lineTotal, 0)
      .toFixed(2);
  },
};

/* ---------- orders ---------- */
const OrdersDB = {
  all() {
    return cache.orders.slice();
  },
  byUser(email) {
    return cache.orders.filter((o) => o.userEmail === email);
  },
  find(id) {
    return cache.orders.find((o) => o.id === id) || null;
  },
  /* Async: resolves once the order is saved, so the caller can
     safely move on to the success page. Throws on failure. */
  async create(order) {
    const user = cache.currentUser;
    const row = {
      id: "ORD" + Date.now(),
      user_id: user ? user.id : null,
      user_email: order.userEmail,
      customer_name: order.customerName,
      phone: order.phone,
      address: order.address,
      payment_method: order.paymentMethod,
      items: order.items,
      total: order.total,
      status: "Processing",
    };
    const { data, error } = await sb.from("orders").insert(row).select().single();
    if (error) throw error;
    const saved = toOrder(data);
    cache.orders.push(saved);
    return saved;
  },
  updateStatus(id, status) {
    const order = this.find(id);
    if (order) order.status = status;
    persist(sb.from("orders").update({ status }).eq("id", id), "the order status");
  },
};
