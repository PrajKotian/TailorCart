/* FrontEnd/scripts/tailorOrders.js
   Tailor Orders Page (Quote + Status Updates + Chat)
   ✅ Uses API_BASE_URL (port 3000)
   ✅ Uses /api/tailors/by-user/:userId (no fetching all tailors)
   ✅ Uses OrderStore for orders + quote + status
   ✅ No forced logout on load
*/

(() => {
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

  // ----- API base (always 3000 in your setup)
  function resolveApiBase() {
    if (window.AuthStore?.API_BASE) return String(window.AuthStore.API_BASE).replace(/\/$/, "");
    if (window.API_BASE_URL) return String(window.API_BASE_URL).replace(/\/$/, "");
    // fallback if page forgot main.js
    return "http://localhost:3000";
  }
  const API_BASE = resolveApiBase();

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
      const u = s?.user && typeof s.user === "object" ? s.user : s;

      return {
        ...u,
        id: u.id ?? s.id ?? null,
        role: String(u.role ?? s.role ?? s.activeRole ?? "").toLowerCase(),
        email: u.email ?? s.email ?? "",
        name: u.name ?? s.name ?? "User",
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
      type === "success" ? "text-success" : type === "error" ? "text-danger" : "text-muted";
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

  async function fetchTailorByUserId(userId) {
    const res = await fetch(`${API_BASE}/api/tailors/by-user/${encodeURIComponent(userId)}`);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || "Tailor profile not found for this account.");
    return data;
  }

  function setActiveTab(status) {
    activeStatus = status;
    const btns = els.tabs?.querySelectorAll(".nav-link") || [];
    btns.forEach((b) => b.classList.toggle("active", b.dataset.status === status));
  }

  function getFilteredOrders() {
    const q = (els.search?.value || "").trim().toLowerCase();
    let list = Array.isArray(allOrders) ? [...allOrders] : [];

    if (activeStatus !== "ALL") {
      list = list.filter((o) => String(o.status || "").toUpperCase() === activeStatus);
    }

    if (q) {
      list = list.filter((o) => {
        const idMatch = String(o.id ?? o.orderId ?? "").toLowerCase().includes(q);
        const garmentMatch = String(o.garmentType || "").toLowerCase().includes(q);
        return idMatch || garmentMatch;
      });
    }

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
        .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
        .map(([k, v]) => `${k}: ${v}`);
      return entries.length ? entries.join(" · ") : "—";
    }
    return "—";
  }

  function openOrderChat(orderId) {
    window.location.href = `tailor-order-chat.html?orderId=${encodeURIComponent(orderId)}`;
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
        const id = esc(o.id ?? o.orderId ?? "");
        const garment = esc(o.garmentType || "Order");
        const st = statusLabel(o.status);
        const addr = esc(o.address || "");
        const created = o.createdAt ? new Date(o.createdAt).toLocaleString() : "";

        const quote = o.quote || null;
        const quoteLine = quote ? `₹${esc(quote.price)} · ${esc(quote.deliveryDays)} days` : "—";

        const statusU = String(o.status || "").toUpperCase();
        const canQuote = statusU === "REQUESTED";
        const canUpdate = ["ACCEPTED", "IN_PROGRESS", "READY"].includes(statusU);
        const canChat = statusU !== "CANCELLED";

        const focusClass = focusOrderId && String(o.id) === String(focusOrderId) ? "tc-order--focus" : "";

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
                ${canChat ? `<button class="btn btn-outline-primary btn-sm" data-action="chat" data-id="${id}">Chat</button>` : ""}
                ${canQuote ? `<button class="btn btn-primary btn-sm" data-action="quote" data-id="${id}">Send Quote</button>` : ""}
                ${canUpdate ? `<button class="btn btn-outline-secondary btn-sm" data-action="status" data-id="${id}">Update Status</button>` : ""}
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

            ${quote?.note ? `<div class="mt-2 small tc-muted">Note: ${esc(quote.note)}</div>` : ""}
          </div>
        `;
      })
      .join("");
  }

  // ----- modals
  let quoteModal = null;
  let statusModal = null;

  function openQuote(order) {
    setMsg(els.quoteMsg, "");
    els.quoteOrderId.value = order.id ?? order.orderId ?? "";
    els.quoteOrderLabel.textContent = `${order.garmentType || "Order"} · #${order.id ?? order.orderId ?? ""}`;
    els.quotePrice.value = "";
    els.quoteDays.value = "";
    els.quoteNote.value = "";
    quoteModal?.show();
  }

  function openStatus(order) {
    setMsg(els.statusMsg, "");
    els.statusOrderId.value = order.id ?? order.orderId ?? "";
    els.statusOrderLabel.textContent = `${order.garmentType || "Order"} · #${order.id ?? order.orderId ?? ""}`;

    const s = String(order.status || "").toUpperCase();
    if (s === "ACCEPTED") els.statusValue.value = "IN_PROGRESS";
    else if (s === "IN_PROGRESS") els.statusValue.value = "READY";
    else if (s === "READY") els.statusValue.value = "DELIVERED";
    else els.statusValue.value = "IN_PROGRESS";

    els.statusNote.value = "";
    statusModal?.show();
  }

  function openDetails(order) {
    const quote = order.quote
      ? `Quote: ₹${order.quote.price} · ${order.quote.deliveryDays} days`
      : "Quote: —";

    const msg = [
      `Order #${order.id ?? order.orderId ?? "—"}`,
      `Garment: ${order.garmentType || "—"}`,
      `Status: ${statusLabel(order.status)}`,
      `Address: ${order.address || "—"}`,
      quote,
      `Measurements: ${formatMeasurements(order.measurements)}`,
    ].join("\n");

    alert(msg);
  }

  async function loadOrders() {
    if (!els.wrap) return;

    els.wrap.innerHTML = `
      <div class="tc-card">
        <div class="tc-card-body">
          <p class="small tc-muted mb-0">Loading orders...</p>
        </div>
      </div>
    `;

    allOrders = await window.OrderStore.getOrdersByTailor(myTailor.id);
    allOrders = Array.isArray(allOrders) ? allOrders : [];
    render();

    if (focusOrderId) {
      const sel = `[data-order-id="${String(focusOrderId).replaceAll('"', '\\"')}"]`;
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el.classList.add("tc-order--focus"), 50);
      }
    }
  }

  async function init() {
    parseParams();

    // Must have OrderStore
    if (!window.OrderStore) {
      if (els.wrap) {
        els.wrap.innerHTML = `<div class="alert alert-danger">OrderStore not loaded. Include ordersStore.js before this script.</div>`;
      }
      return;
    }

    // Session
    currentUser = getSessionUser();
    if (!currentUser || currentUser.role !== "tailor") {
      window.location.href = "login-tailor.html";
      return;
    }

    if (els.tailorName) els.tailorName.textContent = currentUser.name || "Tailor";
    if (els.tailorEmail) els.tailorEmail.textContent = currentUser.email || "—";

    // Logout
    els.logoutBtn?.addEventListener("click", () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "login-tailor.html";
    });

    // Tabs
    els.tabs?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-status]");
      if (!btn) return;
      setActiveTab(btn.dataset.status);
      render();
    });

    // Search
    els.search?.addEventListener("input", () => render());

    // Refresh
    els.refreshBtn?.addEventListener("click", () => loadOrders().catch(console.error));

    // Bootstrap modals
    if (window.bootstrap?.Modal && els.quoteModalEl && els.statusModalEl) {
      quoteModal = new bootstrap.Modal(els.quoteModalEl);
      statusModal = new bootstrap.Modal(els.statusModalEl);
    }

    // ✅ Correct tailor lookup
    myTailor = await fetchTailorByUserId(currentUser.id);

    // Actions (delegation)
    els.wrap?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.dataset.id;
      const action = btn.dataset.action;

      const order = allOrders.find((o) => String(o.id ?? o.orderId) === String(id));
      if (!order) return;

      if (action === "chat") {
        if (String(order.status || "").toUpperCase() === "CANCELLED") {
          alert("Chat is not available for cancelled orders.");
          return;
        }
        openOrderChat(order.id ?? order.orderId);
        return;
      }

      if (action === "quote") openQuote(order);
      if (action === "status") openStatus(order);
      if (action === "details") openDetails(order);
    });

    // Quote submit
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
        setTimeout(() => quoteModal?.hide(), 400);
      } catch (err) {
        setMsg(els.quoteMsg, `❌ ${err.message || err}`, "error");
      }
    });

    // Status submit
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
        setTimeout(() => statusModal?.hide(), 400);
      } catch (err) {
        setMsg(els.statusMsg, `❌ ${err.message || err}`, "error");
      }
    });

    setActiveTab("ALL");
    await loadOrders();
  }

  init().catch((err) => {
    console.error(err);
    if (els.wrap) {
      els.wrap.innerHTML = `
        <div class="alert alert-danger">
          Failed to load orders. Please refresh.
        </div>
      `;
    }
  });
})();
