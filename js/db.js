/* ============================================================
   DOKAN — db.js
   Everything this "backend" needs lives in localStorage.
   This file seeds sample data on first run and exposes small
   helper functions every other page/script can call.
   ============================================================ */

const DB_KEYS = {
  PRODUCTS: "dokan_products",
  USERS: "dokan_users",
  SESSION: "dokan_session",
  CART: "dokan_cart",
  ORDERS: "dokan_orders",
  THEME: "dokan_theme",
  ADMIN_GATE: "dokan_admin_gate",
};

/* Demo admin access code — change this to whatever you like.
   This is a simple front-end gate, not real security: anyone who
   reads admin.js can see it. For a real store this check would
   live on a server instead. */
const ADMIN_ACCESS_CODE = "2026DOKAN";

/* ---------- storage layer ----------
   Some browsers (or file:// pages) block localStorage entirely.
   storageGet/Set try real localStorage first and silently fall
   back to an in-memory object so the app still renders — it just
   won't remember data across a page refresh in that fallback case. */
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
    "Your browser is blocking local storage on this page (common when opening the file directly). Data won't be saved between visits — run this through a local server (see README) to fix it.";
  document.body.prepend(bar);
}

/* ---------- seed data (first run only) ---------- */
function seedDatabase() {
  if (!storageGet(DB_KEYS.PRODUCTS)) {
    const products = [
      { id: "p01", name: "Wireless Headphones", category: "Electronics", price: 89.99, stock: 24, image: "https://picsum.photos/seed/dokan-headphones/600/600", description: "Over-ear wireless headphones with active noise cancellation and 30-hour battery life. Foldable design, plush ear cushions, and a travel case included." },
      { id: "p02", name: "Smart Watch", category: "Electronics", price: 129.00, stock: 15, image: "https://picsum.photos/seed/dokan-smartwatch/600/600", description: "Track workouts, heart rate, and sleep. Always-on AMOLED display, 5-day battery, and swim-proof design." },
      { id: "p03", name: "Bluetooth Speaker", category: "Electronics", price: 49.50, stock: 40, image: "https://picsum.photos/seed/dokan-speaker/600/600", description: "Compact speaker with room-filling sound, 12-hour battery, and IPX6 water resistance. Pairs with two devices at once." },
      { id: "p04", name: "Mechanical Keyboard", category: "Electronics", price: 74.00, stock: 18, image: "https://picsum.photos/seed/dokan-keyboard/600/600", description: "Hot-swappable mechanical keyboard with tactile brown switches, per-key RGB, and a aircraft-grade aluminium frame." },
      { id: "p05", name: "Denim Jacket", category: "Fashion", price: 59.99, stock: 30, image: "https://picsum.photos/seed/dokan-jacket/600/600", description: "Classic mid-wash denim jacket with a relaxed fit, button front, and chest pockets. A wardrobe staple for every season." },
      { id: "p06", name: "Leather Sneakers", category: "Fashion", price: 84.00, stock: 22, image: "https://picsum.photos/seed/dokan-sneakers/600/600", description: "Hand-finished leather sneakers with a cushioned insole and a grip rubber sole built for everyday walking." },
      { id: "p07", name: "Sunglasses", category: "Fashion", price: 24.99, stock: 50, image: "https://picsum.photos/seed/dokan-sunglasses/600/600", description: "UV400 protective lenses in a lightweight acetate frame. Comes with a hard case and cleaning cloth." },
      { id: "p08", name: "Canvas Tote Bag", category: "Fashion", price: 19.50, stock: 60, image: "https://picsum.photos/seed/dokan-tote/600/600", description: "Heavy-duty canvas tote with reinforced stitching and an interior pocket. Big enough for a day of errands." },
      { id: "p09", name: "Ceramic Mug Set", category: "Home & Living", price: 22.00, stock: 35, image: "https://picsum.photos/seed/dokan-mug/600/600", description: "Set of two hand-glazed ceramic mugs, microwave and dishwasher safe. Each piece is subtly one of a kind." },
      { id: "p10", name: "Table Lamp", category: "Home & Living", price: 39.99, stock: 20, image: "https://picsum.photos/seed/dokan-lamp/600/600", description: "Warm-glow table lamp with a linen shade and a solid oak base. Three-step touch dimmer built in." },
      { id: "p11", name: "Woven Throw Blanket", category: "Home & Living", price: 34.50, stock: 28, image: "https://picsum.photos/seed/dokan-blanket/600/600", description: "Soft cotton-blend throw, woven in a classic diamond pattern. Machine washable and generously sized." },
      { id: "p12", name: "Minimalist Notebook Set", category: "Stationery", price: 12.00, stock: 70, image: "https://picsum.photos/seed/dokan-notebook/600/600", description: "Pack of three dot-grid notebooks with a stitched spine and a slim elastic closure. Fountain-pen friendly paper." },
      { id: "p13", name: "The Design of Everyday Things", category: "Books", price: 18.00, stock: 25, image: "https://picsum.photos/seed/dokan-book1/600/600", description: "Don Norman's classic on how good design bridges the gap between people and the objects they use." },
      { id: "p14", name: "Atomic Habits", category: "Books", price: 16.50, stock: 33, image: "https://picsum.photos/seed/dokan-book2/600/600", description: "James Clear's practical guide to building good habits and breaking bad ones, one small change at a time." },
    ];
    storageSet(DB_KEYS.PRODUCTS, JSON.stringify(products));
  }

  if (!storageGet(DB_KEYS.USERS)) {
    const users = [
      { id: "u_admin", name: "Store Admin", email: "admin@dokan.com", password: "admin123", role: "admin" },
    ];
    storageSet(DB_KEYS.USERS, JSON.stringify(users));
  }

  if (!storageGet(DB_KEYS.CART)) {
    storageSet(DB_KEYS.CART, JSON.stringify([]));
  }

  if (!storageGet(DB_KEYS.ORDERS)) {
    storageSet(DB_KEYS.ORDERS, JSON.stringify([]));
  }
}
try {
  seedDatabase();
} catch (err) {
  console.error("Dokan: seeding failed, continuing with empty state.", err);
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
    return readKey(DB_KEYS.PRODUCTS);
  },
  find(id) {
    return this.all().find((p) => p.id === id) || null;
  },
  add(product) {
    const products = this.all();
    product.id = "p" + Date.now();
    products.unshift(product); // newest product shows first
    writeKey(DB_KEYS.PRODUCTS, products);
    return product;
  },
  update(id, changes) {
    const products = this.all().map((p) => (p.id === id ? { ...p, ...changes } : p));
    writeKey(DB_KEYS.PRODUCTS, products);
  },
  adjustStock(id, delta) {
    const products = this.all().map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
    writeKey(DB_KEYS.PRODUCTS, products);
  },
  remove(id) {
    const products = this.all().filter((p) => p.id !== id);
    writeKey(DB_KEYS.PRODUCTS, products);
  },
  categories() {
    return [...new Set(this.all().map((p) => p.category))];
  },
};

/* ---------- users ---------- */
const UsersDB = {
  all() {
    return readKey(DB_KEYS.USERS);
  },
  findByEmail(email) {
    return this.all().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  add(user) {
    const users = this.all();
    user.id = "u" + Date.now();
    user.role = "customer";
    users.push(user);
    writeKey(DB_KEYS.USERS, users);
    return user;
  },
};

/* ---------- session ---------- */
const SessionDB = {
  get() {
    const raw = storageGet(DB_KEYS.SESSION);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      return typeof value === "string" && value ? value : null;
    } catch {
      return null;
    }
  },
  set(email) {
    storageSet(DB_KEYS.SESSION, JSON.stringify(email));
  },
  clear() {
    storageRemove(DB_KEYS.SESSION);
  },
  currentUser() {
    const email = this.get();
    if (!email) return null;
    return UsersDB.findByEmail(email);
  },
};

/* ---------- cart ---------- */
const CartDB = {
  all() {
    return readKey(DB_KEYS.CART);
  },
  save(items) {
    writeKey(DB_KEYS.CART, items);
  },
  add(productId, qty = 1) {
    const cart = this.all();
    const existing = cart.find((i) => i.productId === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ productId, qty });
    }
    this.save(cart);
  },
  updateQty(productId, qty) {
    let cart = this.all();
    if (qty <= 0) {
      cart = cart.filter((i) => i.productId !== productId);
    } else {
      cart = cart.map((i) => (i.productId === productId ? { ...i, qty } : i));
    }
    this.save(cart);
  },
  remove(productId) {
    this.save(this.all().filter((i) => i.productId !== productId));
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
        return { ...i, product, lineTotal: +(product.price * i.qty).toFixed(2) };
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
    return readKey(DB_KEYS.ORDERS);
  },
  byUser(email) {
    return this.all().filter((o) => o.userEmail === email);
  },
  find(id) {
    return this.all().find((o) => o.id === id) || null;
  },
  create(order) {
    const orders = this.all();
    order.id = "ORD" + Date.now();
    order.date = new Date().toISOString();
    order.status = "Processing";
    orders.push(order);
    writeKey(DB_KEYS.ORDERS, orders);
    return order;
  },
  updateStatus(id, status) {
    const orders = this.all().map((o) => (o.id === id ? { ...o, status } : o));
    writeKey(DB_KEYS.ORDERS, orders);
  },
};
