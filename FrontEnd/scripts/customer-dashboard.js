// FrontEnd/scripts/customer-dashboard.js
(function () {
  "use strict";

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
      return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
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

  function normalizeOrder(o) {
    return {
      raw: o,
      id: o?.id ?? o?._id ?? o?.orderId ?? null,
      status: String(o?.status || "REQUESTED").toUpperCase(),
      tailorName: o?.tailor?.shopName || o?.tailor?.name || o?.tailorName || "—",
      garment: o?.garmentType || o?.garment || o?.category || "—",
      quotePrice: o?.quote?.price ?? null,
      createdAt: o?.createdAt || o?.updatedAt || null,
    };
  }

  async function api(path, options = {}) {
    // your authStore has authFetch + apiFetch. :contentReference[oaicite:8]{index=8}
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);

    const base = "http://localhost:5000";
    const res = await fetch(base + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  async function loadSummary(userId) {
    // GET /api/orders/customer/summary?userId=... :contentReference[oaicite:9]{index=9}
    const data = await api(`/api/orders/customer/summary?userId=${encodeURIComponent(userId)}`);
    return data?.summary || null;
  }

  async function loadOrders(userId) {
    // GET /api/orders/by-customer?userId=... :contentReference[oaicite:10]{index=10}
    const data = await api(`/api/orders/by-customer?userId=${encodeURIComponent(userId)}`);
    return Array.isArray(data) ? data : [];
  }

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

  function renderTable(orders, filterStatus) {
    const empty = $("cdOrdersEmpty");
    const tableWrap = $("cdOrdersTableWrap");
    const tbody = $("cdOrdersTbody");
    if (!empty || !tableWrap || !tbody) return;

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
        return `
          <tr>
            <td class="fw-semibold">${label}</td>
            <td>${o.tailorName}</td>
            <td>${o.garment}</td>
            <td>${statusBadge(o.status)}</td>
            <td>${o.quotePrice == null ? "—" : money(o.quotePrice)}</td>
            <td class="text-muted small">${fmtDate(o.createdAt)}</td>
            <td class="text-end">
              <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-outline-secondary" data-action="view" data-id="${o.id}">View</button>
                ${
                  o.status === "QUOTED"
                    ? `<button class="btn btn-sm btn-success" data-action="accept" data-id="${o.id}">Accept</button>`
                    : ""
                }
                ${
                  ["REQUESTED", "QUOTED", "ACCEPTED"].includes(o.status)
                    ? `<button class="btn btn-sm btn-outline-danger" data-action="cancel" data-id="${o.id}">Cancel</button>`
                    : ""
                }
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
    // POST /api/orders/:id/accept :contentReference[oaicite:11]{index=11}
    return api(`/api/orders/${encodeURIComponent(orderId)}/accept`, { method: "POST", body: "{}" });
  }

  async function cancelOrder(orderId) {
    // PATCH /api/orders/:id/status :contentReference[oaicite:12]{index=12}
    return api(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED", note: "Cancelled by customer" }),
    });
  }

  async function init() {
    const user = window.AuthStore?.getCurrentUser?.();
    if (!user) return;

    // Your backend filters by userId string. :contentReference[oaicite:13]{index=13}
    const userId = user.id;
    if (!userId) {
      console.warn("[CustomerDashboard] currentUser.id missing:", user);
      return;
    }

    const statusFilter = $("cdStatusFilter");
    let currentFilter = statusFilter ? statusFilter.value : "ALL";

    let summary = null;
    try {
      summary = await loadSummary(userId);
    } catch (e) {
      console.warn("[CustomerDashboard] summary error:", e?.message || e);
    }

    let ordersRaw = [];
    try {
      ordersRaw = await loadOrders(userId);
    } catch (e) {
      console.error("[CustomerDashboard] orders error:", e?.message || e);
    }

    const orders = (ordersRaw || []).map(normalizeOrder);

    renderSummary(summary, orders.length);
    renderTable(orders, currentFilter);

    statusFilter?.addEventListener("change", () => {
      currentFilter = statusFilter.value;
      renderTable(orders, currentFilter);
    });

    $("cdOrdersTbody")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const order = orders.find((o) => String(o.id) === String(id));
      if (!order) return;

      if (action === "view") return openModal(order);

      if (action === "accept") {
        btn.disabled = true;
        try {
          await acceptQuote(order.id);
          order.status = "ACCEPTED";
          renderSummary(summary, orders.length);
          renderTable(orders, currentFilter);
        } catch (err) {
          alert(err?.message || "Could not accept quote.");
        } finally {
          btn.disabled = false;
        }
      }

      if (action === "cancel") {
        const ok = confirm("Cancel this order?");
        if (!ok) return;

        btn.disabled = true;
        try {
          await cancelOrder(order.id);
          order.status = "CANCELLED";
          renderSummary(summary, orders.length);
          renderTable(orders, currentFilter);
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
