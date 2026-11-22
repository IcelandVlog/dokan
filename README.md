# Dokan — Vanilla JS E-commerce Demo

A vanilla HTML / CSS / JS e-commerce site backed by **Supabase**. Products,
customer accounts (Supabase Auth + a `profiles` table) and orders live in your
Supabase project. The cart, theme and admin-panel gate stay in the browser's
`localStorage`, since they are per-device.

## Supabase setup (one time)

1. In the Supabase dashboard open **SQL Editor → New query**, paste the contents
   of `supabase/schema.sql` and press **Run**. This creates the `profiles`,
   `products` and `orders` tables, the sign-up trigger, and the row-level
   security policies.
2. New query again: paste `supabase/seed.sql` and **Run** to load the 14 demo
   products.
3. The project URL and publishable key are in `js/supabase-client.js`. If you
   switch projects, change them there.
4. Under **Authentication → Providers → Email**, decide whether to keep
   "Confirm email" on. If it is on, new customers must click the link in their
   inbox before they can sign in.

Admin accounts: the admin panel needs a Supabase account with the `admin` role.
Sign up with the admin email on the site, then run the `update public.profiles …`
line at the bottom of `supabase/schema.sql` to promote it. The old seeded
`admin@dokan.com` account is gone.

## Run it in VS Code

1. Unzip and open the `dokan` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.
   - Or, without the extension, run in a terminal from this folder:
     ```
     python3 -m http.server 5500
     ```
     then open `http://localhost:5500` in your browser.

**Important:** don't just double-click `index.html`. Supabase requests and
the cart's `localStorage` both need the page served over `http://`. Always open
it through Live Server or `http://localhost:…`. If local storage is blocked,
the app shows a red banner at the top; a second red banner appears for any
other unexpected error, including a failed Supabase load (for example, if the
schema hasn't been run yet), with the message included.

## Demo access

- **Admin panel:** open Admin from the footer/menu, or go to `admin.html` directly. Sign in with an account whose role is `admin` (see Supabase setup above).
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
- **Security:** only signed-in admins can add, restock, or delete products and confirm orders. The rules are enforced in the database (`is_admin()` in `supabase/schema.sql`), so the browser code can't bypass them. Customers can read only their own orders and profile.
- Customer passwords are handled by Supabase Auth (hashed), not stored by this app.
- Cart, theme and admin-gate state are still per-browser. Clearing site data resets them; products and orders persist in Supabase.

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
├── supabase/
│   ├── schema.sql        Tables, sign-up trigger, RLS policies
│   └── seed.sql          The 14 demo products
└── js/
    ├── supabase-client.js  Supabase URL + publishable key, creates `sb`
    ├── db.js             Supabase-backed data layer (cached) + cart/theme storage
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


## Seller accounts

Visitors apply from the **Sell on Dokan** link in the footer (`apply.html`). The
application is saved as *pending*. In the admin panel, the **Seller requests** tab
lists applications. **Approve & send login** runs the `approve-seller` Edge Function,
which:

1. creates a seller account with a login ID like `rahim4821@dokan.com` and a random
   6–10 digit password,
2. emails those details to the applicant through [Resend](https://resend.com),
3. marks the application approved.

Sellers sign in and use **My shop** (`seller.html`) to add, edit and delete their own
products.

### Deploy the Edge Function

```bash
supabase login
supabase link --project-ref tgbjbtiodsethxtlcysg
supabase secrets set RESEND_API_KEY=re_xxxxxxxx FROM_EMAIL="Dokan <noreply@yourdomain.com>" SITE_URL=https://dokan-ruddy.vercel.app
supabase functions deploy approve-seller
```

- `FROM_EMAIL` must use a domain you verified in Resend. Without a verified domain,
  Resend only delivers to the email on your Resend account, so use
  `onboarding@resend.dev` only for testing.
- Without `RESEND_API_KEY`, approval still creates the account, and the admin sees
  the password once in a popup to pass on by hand.
- Run `supabase/schema.sql` again after pulling this change.

### Known limits

- Sellers don't see orders yet. Orders still go to the admin panel only.
- Sellers can't add colour options; admins can edit seller products in the admin panel.
- Passwords are sent by email in plain text, and the login ID uses `@dokan.com`, which
  is only a login name. Nothing is delivered there. Consider asking sellers to change
  their password after the first sign-in before going live.
