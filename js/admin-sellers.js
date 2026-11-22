/* ============================================================
   DOKAN — admin-sellers.js
   The "Seller requests" tab: review applications, then approve
   (creates the seller account and emails the login, via the
   approve-seller Edge Function) or reject.
   ============================================================ */

let sellerApplications = [];
let sellerBusy = false;

async function loadSellerApplications() {
  const { data, error } = await sb
    .from("seller_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  sellerApplications = data;
}

function sellerRequestHtml(a) {
  const labels = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  return `
    <div class="admin-user-card seller-req">
      <div class="seller-req-head">
        <div>
          <strong>${escapeHtml(a.shop_name)}</strong>
          <p class="muted">${escapeHtml(a.full_name)} · ${escapeHtml(a.email)} · ${escapeHtml(a.phone)}</p>
        </div>
        <span class="status-pill">${escapeHtml(labels[a.status] || a.status)}</span>
      </div>
      <p class="seller-req-meta"><strong>Category:</strong> ${escapeHtml(a.category)}</p>
      <p class="seller-req-meta"><strong>Address:</strong> ${escapeHtml(a.address)}</p>
      <p class="seller-req-meta"><strong>About the products:</strong><br>${escapeHtml(a.about).replace(/\n/g, "<br>")}</p>
      ${a.login_email ? `<p class="seller-req-meta"><strong>Login ID:</strong> ${escapeHtml(a.login_email)}</p>` : ""}
      ${
        a.status === "pending"
          ? `<div class="seller-req-actions">
               <button class="btn btn-outline btn-sm" data-reject="${escapeHtml(a.id)}">Reject</button>
               <button class="btn btn-primary btn-sm" data-approve="${escapeHtml(a.id)}">Approve &amp; send login</button>
             </div>`
          : ""
      }
    </div>`;
}

async function renderSellerRequests() {
  const list = document.getElementById("sellerRequestList");
  list.innerHTML = `<p class="muted">Loading requests…</p>`;
  try {
    await loadSellerApplications();
  } catch (err) {
    list.innerHTML = `<p class="form-error">Could not load requests: ${escapeHtml(err.message)}</p>`;
    return;
  }
  if (!sellerApplications.length) {
    list.innerHTML = `<p class="muted">No seller requests yet.</p>`;
    return;
  }
  list.innerHTML = sellerApplications.map(sellerRequestHtml).join("");
  list.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", () => approveSeller(btn.dataset.approve))
  );
  list.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", () => rejectSeller(btn.dataset.reject))
  );
}

/* Pulls the readable error out of a failed Edge Function call. */
async function edgeFunctionErrorMessage(error) {
  try {
    const body = await error.context.json();
    if (body && body.error) return body.error;
  } catch (e) {
    /* fall through */
  }
  return error.message;
}

async function approveSeller(id) {
  const app = sellerApplications.find((a) => a.id === id);
  if (!app || sellerBusy) return;
  const ok = await confirmDialog(
    `Create a seller account for ${app.shop_name} and email the login details to ${app.email}?`,
    { okText: "Approve" }
  );
  if (!ok) return;

  sellerBusy = true;
  try {
    const { data, error } = await sb.functions.invoke("approve-seller", { body: { applicationId: id } });
    if (error) {
      alert("Could not approve: " + (await edgeFunctionErrorMessage(error)));
      return;
    }
    if (data.emailSent) {
      alert(`Approved. The login details were emailed to ${app.email}.\nUsername: ${data.email}`);
    } else {
      alert(
        `Approved, but the email could not be sent (${data.emailError}).\n` +
          `Pass these on yourself:\nUsername: ${data.email}\nPassword: ${data.password}`
      );
    }
  } finally {
    sellerBusy = false;
    renderSellerRequests();
  }
}

async function rejectSeller(id) {
  const app = sellerApplications.find((a) => a.id === id);
  if (!app || sellerBusy) return;
  const ok = await confirmDialog(`Reject ${app.shop_name}'s request?`, { okText: "Reject", danger: true });
  if (!ok) return;

  sellerBusy = true;
  const { error } = await sb
    .from("seller_applications")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", id);
  sellerBusy = false;
  if (error) alert("Could not reject: " + error.message);
  renderSellerRequests();
}
