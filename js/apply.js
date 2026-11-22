/* ============================================================
   DOKAN — apply.js (sell on Dokan form)
   Saves the application as "pending". Admins review it in the
   admin panel; approval creates the seller account.
   ============================================================ */

whenReady(() => {
  renderHeader({ showSearch: false });
  renderFooter();

  const select = document.getElementById("applyCategory");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a category";
  select.appendChild(placeholder);
  [...ProductsDB.categories(), "Other"].forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });

  const form = document.getElementById("applyForm");
  const errorBox = document.getElementById("applyError");
  const successBox = document.getElementById("applySuccess");
  const button = document.getElementById("applyBtn");
  const val = (id) => document.getElementById(id).value.trim();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    successBox.style.display = "none";

    if (!select.value) {
      errorBox.textContent = "Please choose a category.";
      errorBox.style.display = "block";
      return;
    }

    const row = {
      full_name: val("applyName"),
      email: val("applyEmail"),
      phone: val("applyPhone"),
      shop_name: val("applyShop"),
      category: select.value,
      address: val("applyAddress"),
      about: val("applyAbout"),
      status: "pending",
    };

    button.disabled = true;
    const { error } = await sb.from("seller_applications").insert(row);
    button.disabled = false;

    if (error) {
      errorBox.textContent = "Couldn't send your application: " + error.message;
      errorBox.style.display = "block";
      return;
    }
    form.reset();
    successBox.textContent =
      "Thanks! We've received your application. We'll review it and email your login details to the address you gave.";
    successBox.style.display = "block";
  });
});
