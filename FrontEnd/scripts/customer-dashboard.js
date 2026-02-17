// FrontEnd/scripts/customer-dashboard.js
(function () {
  "use strict";

  // ✅ Use the same API base as main.js / meta tag (defaults to http://localhost:3000)
  const API_BASE = (window.API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

  const STATUS_LABELS = {
    REQUESTED: "Requested",
    QUOTED: "Quoted",
    ACCEPTED: "Accepted",
    IN_PROGRESS: "In Progress",
    READY: "Ready",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };

  const STATUS_BADGE = {
    REQUESTED: "secondary",
    QUOTED: "warning",
    ACCEPTED: "info",
    IN_PROGRESS: "primary",
    READY: "success",
    DELIVERED: "success",
    CANCELLED: "danger",
  };

  // 🔥 PAYMENT CONFIG (dummy but realistic)
  const ADVANCE_PERCENT = 30; // 30% advance, remaining on delivery/ready

  const $ = (id) => document.getElementById(id);

  function money(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `₹${n.toLocaleString("en-IN")}`;
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return "—";
    }
  }

  function statusBadge(status) {
    const s = String(status || "REQUESTED").toUpperCase();
    const bs = STATUS_BADGE[s] || "secondary";
    const label = STATUS_LABELS[s] || s;
    return `<span class="badge bg-${bs}">${label}</span>`;
  }

  // ✅ Payment helpers (reads your backend fields)
  function getTotalAmount(order) {
    const price = order?.raw?.quote?.price;
    const n = Number(price);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function getAdvanceDue(order) {
    const total = getTotalAmount(order);
    if (!total) return 0;
    return Math.round((total * ADVANCE_PERCENT) / 100);
  }

  function getPaidInfo(order) {
    const adv = Number(order?.raw?.payments?.advancePaid || 0);
    const totalPaid = Number(order?.raw?.payments?.totalPaid || 0);
    return { advancePaid: adv, totalPaid };
  }

  function paymentStatusPill(order) {
    const total = getTotalAmount(order);
    if (!total) return `<span class="text-muted small">—</span>`;

    const { totalPaid } = getPaidInfo(order);

    if (totalPaid <= 0) return `<span class="badge bg-danger-subtle text-danger border">Unpaid</span>`;
    if (totalPaid < total) return `<span class="badge bg-warning-subtle text-warning border">Partial</span>`;
    return `<span class="badge bg-success-subtle text-success border">Paid</span>`;
  }

  function normalizeOrder(o) {
    return {
      raw: o,
      id: o?.id ?? o?._id ?? o?.orderId ?? null,
      status: String(o?.status || "REQUESTED").toUpperCase(),
      tailorName: o?.tailor?.shopName || o?.tailor?.name || o?.tailorName || "—",
      tailorId: o?.tailorId ?? o?.tailor?.id ?? null,
      garment: o?.garmentType || o?.garment || o?.category || "—",
      quotePrice: o?.quote?.price ?? o?.quotePrice ?? null,
      createdAt: o?.createdAt || o?.updatedAt || null,
      reviewId: o?.reviewId ?? null, // for "Reviewed" state
    };
  }

  async function api(path, options = {}) {
    // Keep your existing AuthStore integration
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);

    // ✅ FIX: use API_BASE (3000) not hardcoded 5000
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  async function loadSummary(userId) {
    const data = await api(`/api/orders/customer/summary?userId=${encodeURIComponent(userId)}`);
    return data?.summary || data || null;
  }

  async function loadOrders(userId) {
    const data = await api(`/api/orders/by-customer?userId=${encodeURIComponent(userId)}`);
    return Array.isArray(data) ? data : data.orders || [];
  }

  // -------------------- REVIEW MODAL (NO HTML CHANGE REQUIRED) --------------------
  function ensureReviewModalExists() {
    if ($("cdReviewModal")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="modal fade" id="cdReviewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Rate & Review</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body">
              <div class="alert alert-light border small mb-3">
                <div class="fw-semibold" id="cdReviewTailorName">Tailor</div>
                <div class="text-muted" id="cdReviewOrderLabel">Order</div>
                <div class="text-muted">Note: You can submit only once (no edits after submit).</div>
              </div>

              <input type="hidden" id="cdReviewOrderId" />

              <div class="mb-3">
                <label class="form-label fw-semibold">Rating</label>
                <select class="form-select" id="cdReviewRating">
                  <option value="5" selected>★★★★★ (5)</option>
                  <option value="4">★★★★☆ (4)</option>
                  <option value="3">★★★☆☆ (3)</option>
                  <option value="2">★★☆☆☆ (2)</option>
                  <option value="1">★☆☆☆☆ (1)</option>
                </select>
              </div>

              <div class="mb-2">
                <label class="form-label fw-semibold">Review</label>
                <textarea
                  class="form-control"
                  id="cdReviewText"
                  rows="5"
                  placeholder="Write your experience (quality, fitting, delivery, behaviour, etc.)"
                ></textarea>
                <div class="small text-muted mt-1">Max 800 characters.</div>
              </div>

              <div class="text-danger small d-none" id="cdReviewError"></div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="button" class="btn btn-primary" id="cdSubmitReviewBtn">
                Submit Review
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);
  }

  async function submitReview({ orderId, customerId, rating, text }) {
    return api(`/api/reviews`, {
      method: "POST",
      body: JSON.stringify({ orderId, customerId, rating, text }),
    });
  }

  // -------------------- CHAT --------------------
  function openOrderChat(order) {
    const tailorId = order?.tailorId ?? "";
    const orderId = order?.id ?? "";
    if (!tailorId) {
      window.location.href = `inbox.html`;
      return;
    }
    window.location.href =
      `inbox.html?tailorId=${encodeURIComponent(tailorId)}&orderId=${encodeURIComponent(orderId)}`;
  }

  // ============================
  // ✅ PAYMENT MODAL (NO HTML CHANGE REQUIRED)
  // ============================
  function ensurePaymentModalExists() {
    if ($("cdPayModal")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="modal fade" id="cdPayModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <div>
                <h5 class="modal-title mb-0">Secure Payment</h5>
                <div class="small text-muted">Dummy Razorpay-style checkout (college demo)</div>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body">
              <input type="hidden" id="cdPayOrderId" />
              <input type="hidden" id="cdPayType" />

              <div class="border rounded-3 p-3 mb-3 bg-light">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="fw-semibold" id="cdPayTitle">Payment</div>
                    <div class="text-muted small" id="cdPaySub">Order</div>
                  </div>
                  <div class="text-end">
                    <div class="small text-muted">Amount</div>
                    <div class="fs-4 fw-bold" id="cdPayAmount">₹0</div>
                  </div>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <div class="border rounded-3 p-3 h-100">
                    <div class="fw-semibold mb-2">Pay via UPI</div>
                    <div class="small text-muted mb-2">Google Pay / PhonePe / Paytm</div>
                    <input class="form-control mb-2" id="cdPayUpi" placeholder="yourupi@bank" />
                    <button class="btn btn-outline-primary w-100" id="cdPayUpiBtn">Pay with UPI</button>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="border rounded-3 p-3 h-100">
                    <div class="fw-semibold mb-2">Pay via Card</div>
                    <div class="small text-muted mb-2">Visa / MasterCard / RuPay</div>
                    <input class="form-control mb-2" placeholder="Card number (dummy)" />
                    <div class="d-flex gap-2 mb-2">
                      <input class="form-control" placeholder="MM/YY" />
                      <input class="form-control" placeholder="CVV" />
                    </div>
                    <button class="btn btn-primary w-100" id="cdPayCardBtn">Pay with Card</button>
                  </div>
                </div>
              </div>

              <div class="text-danger small d-none mt-3" id="cdPayError"></div>
              <div class="text-muted small mt-3">
                Note: This is a dummy payment module for academic demonstration. No real money is processed.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function openPaymentModal({ order, type }) {
    ensurePaymentModalExists();

    const total = getTotalAmount(order);
    const advanceDue = getAdvanceDue(order);
    const remainingDue = Math.max(total - Number(order.raw?.payments?.totalPaid || 0), 0);

    const amount = type === "advance" ? advanceDue : remainingDue;

    $("cdPayOrderId").value = order.id;
    $("cdPayType").value = type;

    $("cdPayTitle").textContent = type === "advance" ? "Advance Payment" : "Remaining Payment";
    $("cdPaySub").textContent = `Order #${String(order.id).padStart(4, "0")} • ${order.garment}`;
    $("cdPayAmount").textContent = money(amount);

    $("cdPayError").classList.add("d-none");
    $("cdPayError").textContent = "";

    const modalEl = $("cdPayModal");
    const modal = window.bootstrap ? new window.bootstrap.Modal(modalEl) : null;
    modal?.show();

    const runPayment = async (method) => {
      try {
        const payOrderId = $("cdPayOrderId").value;
        const payType = $("cdPayType").value;

        $("cdPayUpiBtn").disabled = true;
        $("cdPayCardBtn").disabled = true;

        // Fake loading UX
        $("cdPayUpiBtn").textContent = "Processing...";
        $("cdPayCardBtn").textContent = "Processing...";

        // ✅ IMPORTANT: use OrderStore methods + correct backend routes
        if (!window.OrderStore) throw new Error("OrderStore not loaded.");

        if (payType === "advance") {
          await window.OrderStore.payAdvance(payOrderId, { amount, method });
        } else {
          await window.OrderStore.payRemaining(payOrderId, { amount, method });
        }

        modal?.hide();
        alert("✅ Payment Successful (Dummy Razorpay Checkout)");
        await reloadAndRender();
      } catch (e) {
        $("cdPayError").textContent = e?.message || "Payment failed.";
        $("cdPayError").classList.remove("d-none");
      } finally {
        $("cdPayUpiBtn").disabled = false;
        $("cdPayCardBtn").disabled = false;
        $("cdPayUpiBtn").textContent = "Pay with UPI";
        $("cdPayCardBtn").textContent = "Pay with Card";
      }
    };

    $("cdPayUpiBtn").onclick = () => runPayment("UPI");
    $("cdPayCardBtn").onclick = () => runPayment("CARD");
  }

  // -------------------- RENDER --------------------
  function renderSummary(summary, totalFallback) {
    const wrap = $("cdSummaryRow");
    if (!wrap) return;

    const s = summary || {};
    const cards = [
      { title: "Total Orders", value: s.total ?? totalFallback ?? 0, hint: "All time", icon: "🧾" },
      { title: "Quoted", value: s.quoted ?? 0, hint: "Awaiting your decision", icon: "💰" },
      { title: "In Progress", value: s.inProgress ?? 0, hint: "Being stitched", icon: "🧵" },
      { title: "Delivered", value: s.delivered ?? 0, hint: "Completed", icon: "✅" },
    ];

    wrap.innerHTML = cards
      .map(
        (c) => `
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex justify-content-between align-items-start">
              <div>
                <div class="text-muted small">${c.title}</div>
                <div class="fs-3 fw-bold">${c.value}</div>
                <div class="small text-muted">${c.hint}</div>
              </div>
              <div style="font-size:22px; opacity:.9;">${c.icon}</div>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  function ensurePaymentColumnHeader() {
    // ✅ Adds Payment column header if not present (no HTML edits)
    const tableWrap = $("cdOrdersTableWrap");
    if (!tableWrap) return;

    const theadRow = tableWrap.querySelector("thead tr");
    if (!theadRow) return;

    const existing = Array.from(theadRow.children).some((th) => th?.textContent?.trim() === "Payment");
    if (existing) return;

    // Insert Payment column before "Created"
    const thPayment = document.createElement("th");
    thPayment.textContent = "Payment";

    const before = theadRow.children[5]; // currently "Created"
    theadRow.insertBefore(thPayment, before);
  }

  function renderTable(orders, filterStatus) {
    const empty = $("cdOrdersEmpty");
    const tableWrap = $("cdOrdersTableWrap");
    const tbody = $("cdOrdersTbody");
    if (!empty || !tableWrap || !tbody) return;

    ensurePaymentColumnHeader();

    const rows =
      filterStatus && filterStatus !== "ALL"
        ? orders.filter((o) => o.status === filterStatus)
        : orders.slice();

    if (!rows.length) {
      tableWrap.classList.add("d-none");
      empty.classList.remove("d-none");
      tbody.innerHTML = "";
      return;
    }

    empty.classList.add("d-none");
    tableWrap.classList.remove("d-none");

    tbody.innerHTML = rows
      .map((o) => {
        const label = o.id ? `#${String(o.id).padStart(4, "0")}` : "—";

        const chatBtn =
          o.status !== "CANCELLED"
            ? `<button class="btn btn-sm btn-outline-primary" data-action="chat" data-id="${o.id}">Chat</button>`
            : "";

        const reviewControl =
          o.status === "DELIVERED"
            ? o.reviewId
              ? `<span class="badge bg-success-subtle text-success border">Reviewed</span>`
              : `<button class="btn btn-sm btn-primary" data-action="review" data-id="${o.id}">Rate & Review</button>`
            : "";

        // ✅ Payment actions
        const total = getTotalAmount(o);
        const advanceDue = getAdvanceDue(o);
        const { advancePaid, totalPaid } = getPaidInfo(o);
        const remainingDue = Math.max(total - totalPaid, 0);

        const canPayAdvance = o.status === "ACCEPTED" && total > 0 && advancePaid <= 0;
        const canPayRemaining = o.status === "READY" && total > 0 && remainingDue > 0;

        const payAdvanceBtn = canPayAdvance
          ? `<button class="btn btn-sm btn-primary" data-action="pay-advance" data-id="${o.id}">
               Pay Advance (${money(advanceDue)})
             </button>`
          : "";

        const payRemainingBtn = canPayRemaining
          ? `<button class="btn btn-sm btn-success" data-action="pay-remaining" data-id="${o.id}">
               Pay Remaining (${money(remainingDue)})
             </button>`
          : "";

        return `
          <tr>
            <td class="fw-semibold">${label}</td>
            <td>${o.tailorName}</td>
            <td>${o.garment}</td>
            <td>${statusBadge(o.status)}</td>
            <td>${o.quotePrice == null ? "—" : money(o.quotePrice)}</td>
            <td>${paymentStatusPill(o)}</td>
            <td class="text-muted small">${fmtDate(o.createdAt)}</td>
            <td class="text-end">
              <div class="d-flex justify-content-end gap-2 flex-wrap">
                ${chatBtn}
                <button class="btn btn-sm btn-outline-secondary" data-action="view" data-id="${o.id}">View</button>
                ${
                  o.status === "QUOTED"
                    ? `<button class="btn btn-sm btn-success" data-action="accept" data-id="${o.id}">Accept</button>`
                    : ""
                }
                ${payAdvanceBtn}
                ${payRemainingBtn}
                ${
                  ["REQUESTED", "QUOTED", "ACCEPTED"].includes(o.status)
                    ? `<button class="btn btn-sm btn-outline-danger" data-action="cancel" data-id="${o.id}">Cancel</button>`
                    : ""
                }
                ${reviewControl}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function openModal(order) {
    const modalEl = $("cdOrderModal");
    const body = $("cdOrderModalBody");
    if (!modalEl || !body) return;

    body.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6"><div class="small text-muted">Order ID</div><div class="fw-semibold">#${order.id ?? "—"}</div></div>
        <div class="col-md-6"><div class="small text-muted">Status</div><div>${statusBadge(order.status)}</div></div>
        <div class="col-md-6"><div class="small text-muted">Tailor</div><div class="fw-semibold">${order.tailorName}</div></div>
        <div class="col-md-6"><div class="small text-muted">Garment</div><div class="fw-semibold">${order.garment}</div></div>
        <div class="col-md-6"><div class="small text-muted">Quote</div><div class="fw-semibold">${order.quotePrice == null ? "—" : money(order.quotePrice)}</div></div>
        <div class="col-md-6"><div class="small text-muted">Created</div><div class="fw-semibold">${fmtDate(order.createdAt)}</div></div>
      </div>
      <hr />
      <pre class="small mb-0" style="white-space:pre-wrap;">${JSON.stringify(order.raw, null, 2)}</pre>
    `;

    const modal = window.bootstrap ? new window.bootstrap.Modal(modalEl) : null;
    modal?.show();
  }

  async function acceptQuote(orderId) {
    return api(`/api/orders/${encodeURIComponent(orderId)}/accept`, {
      method: "POST",
      body: "{}",
    });
  }

  async function cancelOrder(orderId) {
    return api(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED", note: "Cancelled by customer" }),
    });
  }

  // -------------------- MAIN --------------------
  let ORDERS = [];
  let SUMMARY = null;
  let CURRENT_FILTER = "ALL";
  let CURRENT_USER_ID = null;

  async function reloadAndRender() {
    let ordersRaw = [];
    try {
      ordersRaw = await loadOrders(CURRENT_USER_ID);
    } catch (e) {
      console.error("[CustomerDashboard] orders error:", e?.message || e);
    }
    ORDERS = (ordersRaw || []).map(normalizeOrder);

    try {
      SUMMARY = await loadSummary(CURRENT_USER_ID);
    } catch (e) {
      console.warn("[CustomerDashboard] summary error:", e?.message || e);
    }

    renderSummary(SUMMARY, ORDERS.length);
    renderTable(ORDERS, CURRENT_FILTER);
  }

  function openReviewModal(order, userId) {
    ensureReviewModalExists();

    $("cdReviewOrderId").value = order.id;
    $("cdReviewTailorName").textContent = order.tailorName || "Tailor";
    $("cdReviewOrderLabel").textContent = `Order #${String(order.id).padStart(4, "0")} • ${order.garment}`;
    $("cdReviewRating").value = "5";
    $("cdReviewText").value = "";
    $("cdReviewError").classList.add("d-none");
    $("cdReviewError").textContent = "";

    const modalEl = $("cdReviewModal");
    const modal = window.bootstrap ? new window.bootstrap.Modal(modalEl) : null;
    modal?.show();

    const submitBtn = $("cdSubmitReviewBtn");
    submitBtn.onclick = async () => {
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        const orderId = $("cdReviewOrderId").value;
        const rating = Number($("cdReviewRating").value);
        const text = String($("cdReviewText").value || "").trim();

        if (!text || text.length < 2) throw new Error("Please write a short review (min 2 characters).");
        if (text.length > 800) throw new Error("Review too long (max 800 chars).");

        await submitReview({ orderId, customerId: userId, rating, text });

        modal?.hide();
        await reloadAndRender();
      } catch (e) {
        const err = $("cdReviewError");
        err.textContent = e?.message || "Failed to submit review.";
        err.classList.remove("d-none");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Review";
      }
    };
  }

  async function init() {
    const user = window.AuthStore?.getCurrentUser?.();
    if (!user) return;

    // Optional safety: ensure customer
    const role = String(user.role || user.activeRole || "").toLowerCase();
    if (role && role !== "customer") return;

    const userId = user.id;
    if (!userId) {
      console.warn("[CustomerDashboard] currentUser.id missing:", user);
      return;
    }

    CURRENT_USER_ID = userId;

    const statusFilter = $("cdStatusFilter");
    CURRENT_FILTER = statusFilter ? statusFilter.value : "ALL";

    await reloadAndRender();

    statusFilter?.addEventListener("change", () => {
      CURRENT_FILTER = statusFilter.value;
      renderTable(ORDERS, CURRENT_FILTER);
    });

    $("cdOrdersTbody")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const order = ORDERS.find((o) => String(o.id) === String(id));
      if (!order) return;

      if (action === "chat") {
        if (order.status === "CANCELLED") return alert("Chat is not available for cancelled orders.");
        return openOrderChat(order);
      }

      if (action === "view") return openModal(order);

      if (action === "review") {
        if (order.status !== "DELIVERED") return alert("You can review only after delivery.");
        if (order.reviewId) return alert("You have already reviewed this order.");
        return openReviewModal(order, CURRENT_USER_ID);
      }

      if (action === "accept") {
        btn.disabled = true;
        try {
          await acceptQuote(order.id);
          await reloadAndRender();
        } catch (err) {
          alert(err?.message || "Could not accept quote.");
        } finally {
          btn.disabled = false;
        }
      }

      // ✅ Payment actions (new)
      if (action === "pay-advance") {
        return openPaymentModal({ order, type: "advance" });
      }

      if (action === "pay-remaining") {
        return openPaymentModal({ order, type: "remaining" });
      }

      if (action === "cancel") {
        const ok = confirm("Cancel this order?");
        if (!ok) return;

        btn.disabled = true;
        try {
          await cancelOrder(order.id);
          await reloadAndRender();
        } catch (err) {
          alert(err?.message || "Could not cancel order.");
        } finally {
          btn.disabled = false;
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
