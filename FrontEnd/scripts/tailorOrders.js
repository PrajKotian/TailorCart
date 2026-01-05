/* FrontEnd/scripts/tailorOrders.js
   Phase 2: Tailor Orders Page (Quote + Status Updates)
   ✅ FIXED: No forced logout on load + session normalization
*/

(() => {
  const API_BASE = window.API_BASE_URL || "http://localhost:5000";
  const SESSION_KEY = "tc_current_user_v1";

  // ----- DOM
  const els = {
    tailorName: document.getElementById("tcTailorName"),
    tailorEmail: document.getElementById("tcTailorEmail"),
    logoutBtn: document.getElementById("tcLogoutBtn"),
    refreshBtn: document.getElementById("tcRefreshBtn"),
    search: document.getElementById("tcSearch"),
    tabs: document.getElementById("tcStatusTabs"),
    count: document.getElementById("tcCount"),
    wrap: document.getElementById("tcOrdersWrap"),

    // Quote modal
    quoteModalEl: document.getElementById("tcQuoteModal"),
    quoteForm: document.getElementById("tcQuoteForm"),
    quoteMsg: document.getElementById("tcQuoteMsg"),
    quoteOrderLabel: document.getElementById("tcQuoteOrderLabel"),
    quoteOrderId: document.getElementById("tcQuoteOrderId"),
    quotePrice: document.getElementById("tcQuotePrice"),
    quoteDays: document.getElementById("tcQuoteDays"),
    quoteNote: document.getElementById("tcQuoteNote"),

    // Status modal
    statusModalEl: document.getElementById("tcStatusModal"),
    statusForm: document.getElementById("tcStatusForm"),
    statusMsg: document.getElementById("tcStatusMsg"),
    statusOrderLabel: document.getElementById("tcStatusOrderLabel"),
    statusOrderId: document.getElementById("tcStatusOrderId"),
    statusValue: document.getElementById("tcStatusValue"),
    statusNote: document.getElementById("tcStatusNote"),
  };

  // ----- state
  let currentUser = null;
  let myTailor = null;
  let allOrders = [];
  let activeStatus = "ALL";
  let focusOrderId = null;

  // ----- helpers
  function getSessionUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const s = JSON.parse(raw);

      // support both {id,role,...} and {user:{...}}
      const u = s?.user && typeof s.user === "object" ? s.user : s;

      return {
        ...u,
        id: u.id ?? s.id,
        role: (u.role ?? s.role ?? "").toLowerCase(),
        email: u.email ?? s.email,
        name: u.name ?? s.name,
      };
    } catch {
      return null;
    }
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setMsg(el, msg, type = "info") {
    if (!el) return;
    const cls =
      type === "success"
        ? "text-success"
        : type === "error"
        ? "text-danger"
        : "text-muted";
    el.className = `small ${cls}`;
    el.textContent = msg || "";
  }

  function statusLabel(status) {
    const s = String(status || "").toUpperCase();
    const map = {
      REQUESTED: "Requested",
      QUOTED: "Quoted (waiting customer)",
      ACCEPTED: "Accepted",
      IN_PROGRESS: "In progress",
      READY: "Ready",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
    };
    return map[s] || s || "—";
  }

  function parseParams() {
    const u = new URL(window.location.href);
    focusOrderId = u.searchParams.get("focus");
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function fetchAllTailors() {
    const res = await fetch(`${API_BASE}/api/tailors`);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || "Failed to load tailors");
    return Array.isArray(data) ? data : [];
  }

  function setActiveTab(status) {
    activeStatus = status;
    const btns = els.tabs?.querySelectorAll(".nav-link") || [];
    btns.forEach((b) => {
      b.classList.toggle("active", b.dataset.status === status);
    });
  }

  function getFilteredOrders() {
    const q = (els.search?.value || "").trim().toLowerCase();

    let list = [...allOrders];

    if (activeStatus !== "ALL") {
      list = list.filter(
        (o) => String(o.status || "").toUpperCase() === activeStatus
      );
    }

    if (q) {
      list = list.filter((o) => {
        const idMatch = String(o.id).toLowerCase().includes(q);
        const garmentMatch = String(o.garmentType || "")
          .toLowerCase()
          .includes(q);
        return idMatch || garmentMatch;
      });
    }

    // latest first
    list.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      if (db !== da) return db - da;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });

    return list;
  }

  function formatMeasurements(m) {
    if (!m) return "—";
    if (typeof m === "string") return m;
    if (typeof m === "object") {
      const entries = Object.entries(m)
        .filter(
          ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
        )
        .map(([k, v]) => `${k}: ${v}`);
      return entries.length ? entries.join(" · ") : "—";
    }
    return "—";
  }

  function render() {
    const list = getFilteredOrders();
    if (els.count) els.count.textContent = String(list.length);

    if (!els.wrap) return;

    if (!list.length) {
      els.wrap.innerHTML = `
        <div class="tc-card">
          <div class="tc-card-body">
            <p class="small tc-muted mb-0">No orders found for this filter.</p>
          </div>
        </div>
      `;
      return;
    }

    els.wrap.innerHTML = list
      .map((o) => {
        const id = esc(o.id);
        const garment = esc(o.garmentType || "Order");
        const st = statusLabel(o.status);
        const addr = esc(o.address || "");
        const created = o.createdAt ? new Date(o.createdAt).toLocaleString() : "";

        const quote = o.quote || null;
        const quoteLine = quote
          ? `₹${esc(quote.price)} · ${esc(quote.deliveryDays)} days`
          : "—";

        const canQuote = String(o.status || "").toUpperCase() === "REQUESTED";
        const canUpdate = ["ACCEPTED", "IN_PROGRESS", "READY"].includes(
          String(o.status || "").toUpperCase()
        );

        const focusClass =
          focusOrderId && String(o.id) === String(focusOrderId)
            ? "tc-order--focus"
            : "";

        return `
          <div class="tc-order ${focusClass}" data-order-id="${id}">
            <div class="d-flex align-items-start justify-content-between gap-3">
              <div>
                <div class="fw-semibold">${garment} <span class="tc-muted">· #${id}</span></div>
                <div class="tc-small tc-muted mt-1">
                  <span class="tc-badge">${esc(st)}</span>
                  ${addr ? ` · 📍 ${addr}` : ""}
                  ${created ? ` · 🕒 ${esc(created)}` : ""}
                </div>
              </div>

              <div class="tc-actions">
                ${
                  canQuote
                    ? `<button class="btn btn-primary btn-sm" data-action="quote" data-id="${id}">Send Quote</button>`
                    : ""
                }
                ${
                  canUpdate
                    ? `<button class="btn btn-outline-secondary btn-sm" data-action="status" data-id="${id}">Update Status</button>`
                    : ""
                }
                <button class="btn btn-outline-secondary btn-sm" data-action="details" data-id="${id}">Details</button>
              </div>
            </div>

            <div class="mt-3 row g-2">
              <div class="col-md-4">
                <div class="small tc-muted">Quote</div>
                <div class="fw-semibold">${quoteLine}</div>
              </div>
              <div class="col-md-8">
                <div class="small tc-muted">Measurements</div>
                <div class="tc-small">${esc(formatMeasurements(o.measurements))}</div>
              </div>
            </div>

            ${
              quote?.note
                ? `<div class="mt-2 small tc-muted">Note: ${esc(quote.note)}</div>`
                : ""
            }
          </div>
        `;
      })
      .join("");
  }

  // ----- modal handlers
  let quoteModal = null;
  let statusModal = null;

  function openQuote(order) {
    setMsg(els.quoteMsg, "");
    els.quoteOrderId.value = order.id;
    els.quoteOrderLabel.textContent = `${order.garmentType || "Order"} · #${order.id}`;
    els.quotePrice.value = "";
    els.quoteDays.value = "";
    els.quoteNote.value = "";
    quoteModal.show();
  }

  function openStatus(order) {
    setMsg(els.statusMsg, "");
    els.statusOrderId.value = order.id;
    els.statusOrderLabel.textContent = `${order.garmentType || "Order"} · #${order.id}`;

    const s = String(order.status || "").toUpperCase();
    if (s === "ACCEPTED") els.statusValue.value = "IN_PROGRESS";
    else if (s === "IN_PROGRESS") els.statusValue.value = "READY";
    else if (s === "READY") els.statusValue.value = "DELIVERED";
    else els.statusValue.value = "IN_PROGRESS";

    els.statusNote.value = "";
    statusModal.show();
  }

  function openDetails(order) {
    const quote = order.quote
      ? `Quote: ₹${order.quote.price} · ${order.quote.deliveryDays} days`
      : "Quote: —";

    const msg = [
      `Order #${order.id}`,
      `Garment: ${order.garmentType || "—"}`,
      `Status: ${statusLabel(order.status)}`,
      `Address: ${order.address || "—"}`,
      quote,
      `Measurements: ${formatMeasurements(order.measurements)}`,
    ].join("\n");

    alert(msg);
  }

  // ----- API flow
  async function loadOrders() {
    els.wrap.innerHTML = `
      <div class="tc-card">
        <div class="tc-card-body">
          <p class="small tc-muted mb-0">Loading orders...</p>
        </div>
      </div>
    `;

    // ✅ uses your OrderStore backend method
    allOrders = await window.OrderStore.getOrdersByTailor(myTailor.id);
    allOrders = Array.isArray(allOrders) ? allOrders : [];
    render();

    // scroll to focus order if provided
    if (focusOrderId) {
      const el = document.querySelector(
        `[data-order-id="${CSS.escape(String(focusOrderId))}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el.classList.add("tc-order--focus"), 50);
      }
    }
  }

  // ----- init
  async function init() {
    parseParams();

    // ✅ DO NOT remove session. Only read it.
    currentUser = getSessionUser();
    if (!currentUser || currentUser.role !== "tailor") {
      window.location.href = "login-tailor.html";
      return;
    }

    if (els.tailorName) els.tailorName.textContent = currentUser.name || "Tailor";
    if (els.tailorEmail) els.tailorEmail.textContent = currentUser.email || "—";

    // logout
    els.logoutBtn?.addEventListener("click", () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "login-tailor.html";
    });

    // tabs
    els.tabs?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-status]");
      if (!btn) return;
      setActiveTab(btn.dataset.status);
      render();
    });

    // search
    els.search?.addEventListener("input", () => render());

    // refresh
    els.refreshBtn?.addEventListener("click", () => loadOrders().catch(console.error));

    // modals
    quoteModal = new bootstrap.Modal(els.quoteModalEl);
    statusModal = new bootstrap.Modal(els.statusModalEl);

    // find tailor profile by userId
    const tailors = await fetchAllTailors();
    myTailor = tailors.find((t) => String(t.userId) === String(currentUser.id)) || null;

    if (!myTailor) {
      els.wrap.innerHTML = `
        <div class="alert alert-warning">
          <div class="fw-semibold">Tailor profile not linked</div>
          <div class="small">Your login is not connected to a tailor profile (missing userId link). Please re-register tailor account once.</div>
        </div>
      `;
      return;
    }

    // card actions (delegation)
    els.wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const order = allOrders.find((o) => String(o.id) === String(id));
      if (!order) return;

      if (action === "quote") openQuote(order);
      if (action === "status") openStatus(order);
      if (action === "details") openDetails(order);
    });

    // quote submit
    els.quoteForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMsg(els.quoteMsg, "");

      const orderId = els.quoteOrderId.value;
      const price = Number(els.quotePrice.value);
      const deliveryDays = Number(els.quoteDays.value);
      const note = (els.quoteNote.value || "").trim();

      if (!orderId || !price || !deliveryDays) {
        setMsg(els.quoteMsg, "Please enter price and delivery days.", "error");
        return;
      }

      try {
        setMsg(els.quoteMsg, "Sending quote...", "info");
        await window.OrderStore.quoteOrder(orderId, { price, deliveryDays, note });
        setMsg(els.quoteMsg, "✅ Quote sent!", "success");
        await loadOrders();
        setTimeout(() => quoteModal.hide(), 400);
      } catch (err) {
        setMsg(els.quoteMsg, `❌ ${err.message || err}`, "error");
      }
    });

    // status submit
    els.statusForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMsg(els.statusMsg, "");

      const orderId = els.statusOrderId.value;
      const status = els.statusValue.value;
      const note = (els.statusNote.value || "").trim();

      if (!orderId || !status) {
        setMsg(els.statusMsg, "Please select a status.", "error");
        return;
      }

      try {
        setMsg(els.statusMsg, "Updating status...", "info");
        await window.OrderStore.updateStatus(orderId, status, note);
        setMsg(els.statusMsg, "✅ Status updated!", "success");
        await loadOrders();
        setTimeout(() => statusModal.hide(), 400);
      } catch (err) {
        setMsg(els.statusMsg, `❌ ${err.message || err}`, "error");
      }
    });

    setActiveTab("ALL");
    await loadOrders();
  }

  init().catch((err) => {
    console.error(err);
    els.wrap.innerHTML = `
      <div class="alert alert-danger">
        Failed to load orders. Please refresh.
      </div>
    `;
  });
})();
