// FrontEnd/scripts/tailor-orders.js
// Backend-powered Tailor Orders page (uses OrderStore + backend APIs)
// ✅ Works with existing tailor-orders.html DOM ids
(() => {
  const $ = (id) => document.getElementById(id);

  const summaryRow = $("toSummaryRow");
  const tbody = $("toTbody");
  const emptyEl = $("toEmpty");
  const tableWrap = $("toTableWrap");
  const msgEl = $("toMsg");
  const statusFilter = $("toStatusFilter");
  const searchInput = $("toSearch");

  const modalEl = $("toModal");
  const modalBody = $("toModalBody");
  const modal = modalEl && window.bootstrap?.Modal ? new bootstrap.Modal(modalEl) : null;

  const SESSION_KEY = "tc_current_user_v1";

  let myTailor = null; // {id, userId, ...}
  let allOrders = [];

  // -----------------------------
  // Helpers
  // -----------------------------
  function resolveApiBase() {
    if (window.API_BASE_URL && typeof window.API_BASE_URL === "string") {
      return window.API_BASE_URL.replace(/\/$/, "");
    }
    if (window.AuthStore?.API_BASE && typeof window.AuthStore.API_BASE === "string") {
      return window.AuthStore.API_BASE.replace(/\/$/, "");
    }
    return "http://localhost:3000";
  }

  const API_BASE = resolveApiBase();

  function setMsg(text = "", type = "muted") {
    if (!msgEl) return;
    msgEl.className =
      "small mt-2 " +
      (type === "error" ? "text-danger" : type === "success" ? "text-success" : "text-muted");
    msgEl.textContent = text || "";
  }

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getSession() {
    return safeParse(localStorage.getItem(SESSION_KEY) || "null");
  }

  function normalizeUser(session) {
    if (!session) return null;
    const u = session.user && typeof session.user === "object" ? session.user : session;
    return {
      id: u.id ?? session.id ?? null,
      email: u.email ?? session.email ?? null,
      name: u.name ?? session.name ?? "User",
      role: String(u.role ?? session.role ?? session.activeRole ?? "").toLowerCase(),
    };
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function apiFetch(path, options = {}) {
    // Prefer AuthStore helper if present
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);

    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });

    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
    return data;
  }

  async function fetchTailorByUserId(userId) {
    const res = await fetch(`${API_BASE}/api/tailors/by-user/${encodeURIComponent(userId)}`);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || "Failed to find tailor profile for this account.");
    return data;
  }

  function fmtDate(d) {
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return "—";
      return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "—";
    }
  }

  function badge(status) {
    const s = String(status || "").toUpperCase();
    const map = {
      REQUESTED: "secondary",
      QUOTED: "warning",
      ACCEPTED: "info",
      IN_PROGRESS: "primary",
      READY: "success",
      DELIVERED: "dark",
      CANCELLED: "danger",
    };
    const c = map[s] || "secondary";
    return `<span class="badge bg-${c}">${s || "—"}</span>`;
  }

  function money(v) {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    return `₹${n.toLocaleString("en-IN")}`;
  }

  function computeSummary(orders) {
    const count = (s) => orders.filter((o) => String(o.status || "").toUpperCase() === s).length;
    const requested = count("REQUESTED");
    const active = count("ACCEPTED") + count("IN_PROGRESS") + count("READY");
    const delivered = count("DELIVERED");
    const quoted = count("QUOTED");

    return [
      { title: "New Requests", value: requested, sub: "Need your quote / action" },
      { title: "Active Orders", value: active, sub: "In progress / ready" },
      { title: "Quoted", value: quoted, sub: "Waiting for customer" },
      { title: "Delivered", value: delivered, sub: "Completed" },
    ];
  }

  function renderSummary(orders) {
    if (!summaryRow) return;
    const cards = computeSummary(orders);

    summaryRow.innerHTML = cards
      .map(
        (c) => `
      <div class="col-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small">${c.title}</div>
            <div class="h3 mb-1">${c.value}</div>
            <div class="text-muted small">${c.sub}</div>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  function getFilteredOrders() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const f = String(statusFilter?.value || "ALL").toUpperCase();

    let list = Array.isArray(allOrders) ? [...allOrders] : [];

    if (f !== "ALL") list = list.filter((o) => String(o.status || "").toUpperCase() === f);

    if (q) {
      list = list.filter((o) => {
        const id = String(o.id || o.orderId || o._id || "").toLowerCase();
        const garment = String(o.garmentType || o.garment || "").toLowerCase();
        const customer = String(o.customerName || o.customerEmail || "").toLowerCase();
        return id.includes(q) || garment.includes(q) || customer.includes(q);
      });
    }

    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  function renderTable() {
    if (!tbody || !emptyEl || !tableWrap) return;

    const list = getFilteredOrders();

    if (!list.length) {
      emptyEl.classList.remove("d-none");
      tableWrap.classList.add("d-none");
      tbody.innerHTML = "";
      return;
    }

    emptyEl.classList.add("d-none");
    tableWrap.classList.remove("d-none");

    tbody.innerHTML = list
      .map((o) => {
        const id = o.id || o.orderId || o._id || "—";
        const customer = o.customerName || o.customerEmail || "Customer";
        const garment = o.garmentType || o.garment || "—";
        const status = String(o.status || "").toUpperCase();

        const quote = o.quote?.price ?? o.quoteAmount ?? o.priceQuote ?? o.price ?? null;
        const created = fmtDate(o.createdAt);

        const actions = `
          <div class="d-flex justify-content-end gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-secondary" data-act="view" data-id="${id}">View</button>
            ${
              status === "REQUESTED"
                ? `<button class="btn btn-sm btn-primary" data-act="quote" data-id="${id}">Send Quote</button>`
                : ""
            }
            ${
              status === "ACCEPTED"
                ? `<button class="btn btn-sm btn-outline-primary" data-act="progress" data-id="${id}">Start</button>`
                : ""
            }
            ${
              status === "IN_PROGRESS"
                ? `<button class="btn btn-sm btn-outline-success" data-act="ready" data-id="${id}">Mark Ready</button>`
                : ""
            }
            ${
              status === "READY"
                ? `<button class="btn btn-sm btn-success" data-act="delivered" data-id="${id}">Delivered</button>`
                : ""
            }
            ${
              status !== "DELIVERED" && status !== "CANCELLED"
                ? `<button class="btn btn-sm btn-outline-danger" data-act="cancel" data-id="${id}">Cancel</button>`
                : ""
            }
          </div>
        `;

        return `
          <tr>
            <td class="fw-semibold">#${id}</td>
            <td>${customer}</td>
            <td>${garment}</td>
            <td>${badge(status)}</td>
            <td class="fw-semibold">${money(quote)}</td>
            <td>${created}</td>
            <td class="text-end">${actions}</td>
          </tr>
        `;
      })
      .join("");
  }

  function openModal(order) {
    if (!modalBody || !modal) {
      setMsg("Modal not available. Check bootstrap JS include.", "error");
      return;
    }

    const id = order.id || order.orderId || order._id || "—";
    const customer = order.customerName || order.customerEmail || "Customer";
    const garment = order.garmentType || order.garment || "—";
    const status = String(order.status || "").toUpperCase();

    const quoteValue = order.quote?.price ?? order.quoteAmount ?? "";
    const daysValue = order.quote?.deliveryDays ?? "";
    const notes = order.designNotes || order.notes || order.description || "—";
    const created = fmtDate(order.createdAt);

    modalBody.innerHTML = `
      <div class="mb-2">
        <span class="text-muted small">Order</span>
        <div class="h5 mb-0">#${id}</div>
      </div>
      <hr />
      <div class="row g-3">
        <div class="col-md-6">
          <div class="text-muted small">Customer</div>
          <div class="fw-semibold">${customer}</div>
        </div>
        <div class="col-md-6">
          <div class="text-muted small">Garment</div>
          <div class="fw-semibold">${garment}</div>
        </div>
        <div class="col-md-6">
          <div class="text-muted small">Status</div>
          <div>${badge(status)}</div>
        </div>
        <div class="col-md-6">
          <div class="text-muted small">Created</div>
          <div class="fw-semibold">${created}</div>
        </div>

        <div class="col-12">
          <div class="text-muted small">Notes / Instructions</div>
          <div class="border rounded-3 p-2">${notes}</div>
        </div>

        <div class="col-12">
          <div class="text-muted small mb-1">Send Quote (₹)</div>
          <div class="d-flex gap-2">
            <input id="toQuoteInput" class="form-control" type="number" min="0" value="${quoteValue}" placeholder="Enter quote amount" />
            <input id="toDaysInput" class="form-control" type="number" min="1" value="${daysValue}" placeholder="Days" style="max-width: 140px;" />
            <button id="toSendQuoteBtn" class="btn btn-primary">Send</button>
          </div>
          <div class="text-muted small mt-2">Quote will move status to <b>QUOTED</b>.</div>
        </div>
      </div>
    `;

    // Bind send quote
    setTimeout(() => {
      const quoteInput = document.getElementById("toQuoteInput");
      const daysInput = document.getElementById("toDaysInput");
      const sendBtn = document.getElementById("toSendQuoteBtn");
      if (!sendBtn) return;

      sendBtn.onclick = async () => {
        const price = Number(quoteInput?.value);
        const deliveryDays = Number(daysInput?.value);

        if (!price || Number.isNaN(price) || price <= 0) {
          setMsg("Please enter a valid quote amount.", "error");
          return;
        }
        if (!deliveryDays || Number.isNaN(deliveryDays) || deliveryDays <= 0) {
          setMsg("Please enter valid delivery days.", "error");
          return;
        }

        try {
          setMsg("Sending quote...", "muted");
          await window.OrderStore.quoteOrder(id, { price, deliveryDays, note: "" });
          setMsg("✅ Quote sent.", "success");
          await refresh();
          modal.hide();
        } catch (e) {
          setMsg(`❌ ${e.message || "Failed to send quote"}`, "error");
        }
      };
    }, 0);

    modal.show();
  }

  async function refresh() {
    if (!myTailor?.id) return;

    setMsg("");

    try {
      allOrders = await window.OrderStore.getOrdersByTailor(myTailor.id);
      if (!Array.isArray(allOrders)) allOrders = [];
      renderSummary(allOrders);
      renderTable();
    } catch (e) {
      allOrders = [];
      renderSummary([]);
      renderTable();
      setMsg(`❌ ${e.message || "Failed to load orders"}`, "error");
    }
  }

  async function handleAction(act, id) {
    const order = allOrders.find((o) => String(o.id || o.orderId || o._id) === String(id));
    if (!order) return;

    if (act === "view" || act === "quote") {
      openModal(order);
      return;
    }

    try {
      if (act === "progress") {
        await window.OrderStore.updateStatus(id, "IN_PROGRESS", "");
        setMsg("✅ Moved to IN_PROGRESS", "success");
      } else if (act === "ready") {
        await window.OrderStore.updateStatus(id, "READY", "");
        setMsg("✅ Marked READY", "success");
      } else if (act === "delivered") {
        await window.OrderStore.updateStatus(id, "DELIVERED", "");
        setMsg("✅ Marked DELIVERED", "success");
      } else if (act === "cancel") {
        if (!confirm("Cancel this order?")) return;
        await window.OrderStore.updateStatus(id, "CANCELLED", "");
        setMsg("✅ Order cancelled", "success");
      }
      await refresh();
    } catch (err) {
      setMsg(`❌ ${err.message || "Action failed"}`, "error");
    }
  }

  async function init() {
    // Must have OrderStore
    if (!window.OrderStore) {
      setMsg("OrderStore not loaded. Check scripts include ordersStore.js before this file.", "error");
      return;
    }

    // Session
    const session = getSession();
    const user = normalizeUser(session);

    if (!user || user.role !== "tailor") {
      window.location.href = "login.html?role=tailor";
      return;
    }

    // Load linked tailor profile
    setMsg("Loading tailor profile...", "muted");
    myTailor = await fetchTailorByUserId(user.id);

    // Events
    statusFilter?.addEventListener("change", () => renderTable());
    searchInput?.addEventListener("input", () => renderTable());

    // Actions (bind only table body to avoid global conflicts)
    tbody?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const act = btn.getAttribute("data-act");
      const id = btn.getAttribute("data-id");
      if (!act || !id) return;
      handleAction(act, id);
    });

    await refresh();
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => setMsg(`❌ ${e.message || "Init failed"}`, "error"));
  });
})();
