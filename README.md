# Dokan — Vanilla JS E-commerce Demo

A fully client-side e-commerce site (HTML, CSS, vanilla JS). No backend —
all data (products, users, cart, orders) lives in the browser's
`localStorage`, so it "feels" dynamic without needing a server or database.

## Run it in VS Code

1. Unzip and open the `dokan` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.
   - Or, without the extension, run in a terminal from this folder:
     ```
     python3 -m http.server 5500
     ```
     then open `http://localhost:5500` in your browser.

**Important:** don't just double-click `index.html`. Several browsers block
`localStorage` on `file://` pages, which is what this app uses to store
products, users, cart and orders — so nothing will render. Always open it
through Live Server or `http://localhost:…`. If storage ever *is* blocked,
the app now shows a red banner at the top telling you so, and a second red
banner will appear for any other unexpected error, with the message
included, instead of leaving you with a blank page.

## Demo access

- **Admin panel:** open Admin from the footer/menu, or go to `admin.html` directly — it's gated by an access code, not a user login: **`2026DOKAN`**
- Or sign up as a new customer from the Sign up page to shop and place orders.

## What's included

- **Search** — live search bar in the header, plus category filter chips; the search bar now stays usable on mobile (drops to its own row instead of disappearing below 860px)
- **Dark / light mode** — toggle in the header; whichever mode you pick is what you'll see on refresh, no more silently flipping back
- **Browsing & cart without an account** — anyone can browse and add to cart
- **Sign in required only at checkout** — cart persists, checkout redirects to login/signup and returns you to checkout after
- **Product details page** — full description, price, and a quantity stepper before adding to cart
- **Cart** — adjust quantities or remove items; the total is the live sum of every line (price × qty) across all products in the cart
- **Checkout** — shipping details form, order summary, "Place order"
- **Order success page** — confirmation + "Continue shopping" back to Home
- **My orders** — signed-in customers can see their past orders
- **Pagination** — 10 products per page on the shop, and 10 rows per page in every admin list (products, users, orders), with numbered page buttons
- **Admin panel** (code-gated, separate from customer accounts):
  - **Products** — add new products (picked from a category dropdown, or type a brand-new category), delete products, and restock any product with a quick "+ Stock" control
  - **Users** — see every registered customer; click a row to expand and see that customer's orders and total spend right there, linked together like a mini database
  - **Orders** — every order placed, newest first. New orders start as **Processing**; press **Confirm order** to mark it **Confirmed** — this is also the moment stock is deducted for those items, so nothing comes off the shelf until an admin actually confirms it
  - New products you add always appear at the very top of the shop and the admin list

## Notes

- Product images are pulled from `picsum.photos` placeholders at runtime — you'll need an internet connection for those to load (or swap in your own image URLs from the Admin → Add product form).
- Passwords are stored in plain text in `localStorage` for demo purposes only — **do not use this auth approach in a real product**.
- Clearing your browser's site data resets everything back to the seed data.

## File structure

```
dokan/
├── index.html          Home (search, categories, product grid)
├── product.html         Product details
├── cart.html             Cart
├── checkout.html      Shipping + order summary
├── success.html        Order confirmation
├── login.html            Sign in
├── signup.html          Sign up
├── orders.html          Customer order history
├── admin.html           Admin panel
├── css/style.css        All styling (light + dark theme)
└── js/
    ├── db.js             localStorage data layer + seed data
    ├── theme.js          Dark/light mode
    ├── auth.js           Sign in / sign up / route guards
    ├── components.js     Shared header & footer
    ├── main.js            Home page logic
    ├── product.js         Product detail logic
    ├── cart-page.js       Cart page logic
    ├── checkout.js        Checkout logic
    ├── success.js         Success page logic
    ├── orders.js          Order history logic
    ├── login.js / signup.js
    └── admin.js           Admin panel logic
```
