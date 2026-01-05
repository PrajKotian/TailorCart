// FrontEnd/scripts/profile.js
(function () {
  "use strict";

  const bar = document.getElementById("tcProgressBar");
  const spot = document.getElementById("tcSpotlight");

  // Reveal
  const revealEls = document.querySelectorAll(".tc-reveal");
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-inview")),
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  // Progress bar
  function updateProgress() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const height = doc.scrollHeight - doc.clientHeight;
    const p = height > 0 ? (scrollTop / height) * 100 : 0;
    if (bar) bar.style.width = `${p}%`;
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);

  // Spotlight
  let mx = window.innerWidth * 0.5,
    my = window.innerHeight * 0.28;
  let tx = mx,
    ty = my;
  window.addEventListener("mousemove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });

  function animateSpot() {
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;
    if (spot) {
      spot.style.left = `${mx}px`;
      spot.style.top = `${my}px`;
    }
    requestAnimationFrame(animateSpot);
  }
  animateSpot();

  // Tabs
  const sideItems = document.querySelectorAll(".tc-sidenav__item[data-target]");
  const tabs = document.querySelectorAll(".tc-tab");

  function openTab(id) {
    tabs.forEach((t) => t.classList.toggle("is-active", `#${t.id}` === id));
    sideItems.forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-target") === id));

    const topbar = document.querySelector(".tc-topbar");
    if (window.innerWidth < 992 && topbar) topbar.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  sideItems.forEach((btn) => btn.addEventListener("click", () => openTab(btn.getAttribute("data-target"))));
  document.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const to = btn.getAttribute("data-jump");
      const matchingSide = document.querySelector(`.tc-sidenav__item[data-target="${to}"]`);
      if (matchingSide) matchingSide.click();
      else openTab(to);
    });
  });

  // Logout
  document.getElementById("tcLogoutBtn")?.addEventListener("click", () => {
    document.getElementById("navLogoutBtn")?.click();
  });

  // -----------------------------
  // Helpers
  // -----------------------------
  const state = { user: null, addresses: [], orders: [], summary: null };
  const $ = (id) => document.getElementById(id);

  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }
  function uid() {
    return `addr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function moneyINR(v) {
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

  function normalizeUser(u) {
    const name = u?.name || "User";
    const role = u?.activeRole || u?.role || "customer";
    const cityFull = u?.city || "—";
    const cityShort = (cityFull || "—").split(",")[0] || "—";
    return {
      id: u?.id,
      name,
      role: String(role || "customer").toLowerCase(),
      cityShort,
      cityFull,
      phone: u?.phone || "—",
      email: u?.email || "—",
    };
  }

  function normalizeOrders(arr) {
    const list = Array.isArray(arr) ? arr : [];
    return list.map((o) => ({
      raw: o,
      id: o?.id ?? o?._id ?? o?.orderId ?? null,
      status: String(o?.status || "REQUESTED").toUpperCase(),
      garment: o?.garmentType || "—",
      tailorName:
        o?.tailor?.shopName ||
        o?.tailor?.name ||
        (o?.tailorId != null ? `Tailor #${o.tailorId}` : "—"),
      quotePrice: o?.quote?.price ?? null,
      createdAt: o?.createdAt || o?.updatedAt || null,
    }));
  }

  function statusBadge(status) {
    const s = String(status || "REQUESTED").toUpperCase();
    const map = {
      REQUESTED: "secondary",
      QUOTED: "warning",
      ACCEPTED: "info",
      IN_PROGRESS: "primary",
      READY: "success",
      DELIVERED: "success",
      CANCELLED: "danger",
    };
    const labelMap = {
      REQUESTED: "Requested",
      QUOTED: "Quoted",
      ACCEPTED: "Accepted",
      IN_PROGRESS: "In Progress",
      READY: "Ready",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
    };
    const bs = map[s] || "secondary";
    const label = labelMap[s] || s;
    return `<span class="badge bg-${bs}">${label}</span>`;
  }

  function setMsg(id, text, type = "muted") {
    const el = $(id);
    if (!el) return;
    el.className =
      type === "success" ? "small text-success" : type === "error" ? "small text-danger" : "small text-muted";
    el.textContent = text || "";
  }

  async function api(path, options = {}) {
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);

    const base = "http://localhost:5000";
    const res = await fetch(base + path, { headers: { "Content-Type": "application/json" }, ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  // -----------------------------
  // Addresses (✅ Backend + fallback)
  // -----------------------------
  function addrKey() {
    const id = state.user?.id || "guest";
    return `tc_addresses_v1_${id}`;
  }

  // Fallback local
  function loadAddressesLocal() {
    state.addresses = safeParse(localStorage.getItem(addrKey()), []);
  }
  function saveAddressesLocal() {
    localStorage.setItem(addrKey(), JSON.stringify(state.addresses));
  }

  async function loadAddressesRemote() {
    const uid = state.user?.id;
    if (!uid) {
      state.addresses = [];
      return;
    }
    const res = await api(`/api/auth/addresses?userId=${encodeURIComponent(uid)}`, { method: "GET" });
    state.addresses = Array.isArray(res?.addresses) ? res.addresses : [];
    // keep a local copy for safety
    saveAddressesLocal();
  }

  async function saveAddressesRemote() {
    const uid = state.user?.id;
    if (!uid) return;
    await api(`/api/auth/addresses?userId=${encodeURIComponent(uid)}`, {
      method: "PUT",
      body: JSON.stringify({ addresses: state.addresses }),
    });
    saveAddressesLocal();
  }

  function setAddrMsg(text, type = "muted") {
    const el = $("addrMsg");
    if (!el) return;
    el.className =
      type === "success" ? "small text-success" : type === "error" ? "small text-danger" : "small text-muted";
    el.textContent = text || "";
  }

  function renderAddressesPreview() {
    const el = $("addressPreview");
    if (!el) return;

    const list = (state.addresses || []).slice(0, 2);
    if (!list.length) {
      el.innerHTML = `<div class="tc-muted">No addresses saved yet.</div>`;
      return;
    }

    el.innerHTML = list
      .map(
        (a) => `
      <div class="tc-addressmini__item">
        <div class="tc-tag">${a.label || "Address"}</div>
        <div class="fw-bold">${a.line1 || "—"}</div>
        <div class="tc-muted">${a.city || "—"} ${a.pincode ? "• " + a.pincode : ""}</div>
      </div>
    `
      )
      .join("");
  }

  function renderAddressesList() {
    const el = $("addressList");
    if (!el) return;

    if (!state.addresses.length) {
      el.innerHTML = `<div class="tc-muted">No addresses saved yet.</div>`;
      return;
    }

    el.innerHTML = state.addresses
      .map(
        (a) => `
      <div class="tc-addresscard">
        <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
          <div>
            <div class="tc-tag">${a.label || "Address"}</div>
            <div class="fw-bold mt-2">${a.name || "—"}</div>
            <div class="tc-muted">Phone: ${a.phone || "—"}</div>
            ${a.email ? `<div class="tc-muted">Email: ${a.email}</div>` : ""}
            <div class="fw-bold mt-2">${a.line1 || "—"}</div>
            ${a.line2 ? `<div class="tc-muted">${a.line2}</div>` : ""}
            <div class="tc-muted">${a.city || "—"}, ${a.state || "—"} - ${a.pincode || "—"}</div>
            ${a.notes ? `<div class="tc-muted mt-2">Notes: ${a.notes}</div>` : ""}
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-danger" type="button" data-addr-del="${a.id}">Delete</button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  function bindAddressForm() {
    const form = $("tcAddressForm");
    if (!form) return;

    const clearBtn = $("addrClearBtn");

    function clearForm(prefill = true) {
      form.reset();
      setAddrMsg("");
      if (!prefill) return;
      const u = state.user || {};
      $("addrName") && ($("addrName").value = u.name && u.name !== "User" ? u.name : "");
      $("addrPhone") && ($("addrPhone").value = u.phone && u.phone !== "—" ? u.phone : "");
      $("addrEmail") && ($("addrEmail").value = u.email && u.email !== "—" ? u.email : "");
    }

    clearBtn?.addEventListener("click", () => clearForm(false));

    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-addr-del]");
      if (!btn) return;
      const id = btn.getAttribute("data-addr-del");
      if (!confirm("Delete this address?")) return;

      try {
        state.addresses = state.addresses.filter((x) => String(x.id) !== String(id));
        await saveAddressesRemote();
        setAddrMsg("✅ Address deleted.", "success");
      } catch (err) {
        // fallback to local if backend fails
        saveAddressesLocal();
        setAddrMsg("❌ Backend save failed. Kept local copy.", "error");
      }

      renderAddressesPreview();
      renderAddressesList();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setAddrMsg("");

      const label = $("addrLabel")?.value || "Home";
      const name = $("addrName")?.value?.trim() || "";
      const phone = $("addrPhone")?.value?.trim() || "";
      const email = $("addrEmail")?.value?.trim() || "";
      const line1 = $("addrLine1")?.value?.trim() || "";
      const line2 = $("addrLine2")?.value?.trim() || "";
      const city = $("addrCity")?.value?.trim() || "";
      const stateVal = $("addrState")?.value?.trim() || "";
      const pincode = $("addrPincode")?.value?.trim() || "";
      const notes = $("addrNotes")?.value?.trim() || "";

      if (!name || !phone || !line1 || !city || !stateVal || !pincode) {
        setAddrMsg("Please fill all required fields.", "error");
        return;
      }
      if (!/^\d{10}$/.test(phone)) {
        setAddrMsg("Phone must be 10 digits.", "error");
        return;
      }
      if (!/^\d{6}$/.test(pincode)) {
        setAddrMsg("PIN code must be 6 digits.", "error");
        return;
      }

      state.addresses.unshift({
        id: uid(),
        label,
        name,
        phone,
        email,
        line1,
        line2,
        city,
        state: stateVal,
        pincode,
        notes,
        createdAt: new Date().toISOString(),
      });

      try {
        await saveAddressesRemote();
        setAddrMsg("✅ Address saved to backend.", "success");
      } catch (err) {
        saveAddressesLocal();
        setAddrMsg("❌ Backend save failed. Saved locally.", "error");
      }

      clearForm(true);
      renderAddressesPreview();
      renderAddressesList();
    });

    clearForm(true);
  }

  // -----------------------------
  // Orders (unchanged)
  // -----------------------------
  function renderOrdersSummary() {
    const wrap = $("poSummaryRow");
    if (!wrap) return;

    const s = state.summary || {};
    const total = s.total ?? state.orders.length ?? 0;

    const cards = [
      { title: "Total", value: total, hint: "All time", icon: "🧾" },
      { title: "Quoted", value: s.quoted ?? 0, hint: "Needs your action", icon: "💰" },
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

  function renderOrdersTable(filterStatus = "ALL") {
    const empty = $("poOrdersEmpty");
    const tableWrap = $("poOrdersTableWrap");
    const tbody = $("poOrdersTbody");
    const meta = $("poOrdersMeta");
    if (!empty || !tableWrap || !tbody) return;

    const rows =
      filterStatus && filterStatus !== "ALL"
        ? state.orders.filter((o) => o.status === filterStatus)
        : state.orders.slice();

    meta && (meta.textContent = `${rows.length} order(s) shown`);

    if (!rows.length) {
      tableWrap.style.display = "none";
      empty.style.display = "block";
      tbody.innerHTML = "";
      return;
    }

    empty.style.display = "none";
    tableWrap.style.display = "block";

    tbody.innerHTML = rows
      .map((o) => {
        const label = o.id != null ? `#${String(o.id).padStart(4, "0")}` : "—";
        const quote = o.quotePrice == null ? "—" : moneyINR(o.quotePrice);

        const acceptBtn =
          o.status === "QUOTED"
            ? `<button class="btn btn-sm btn-success" data-act="accept" data-id="${o.id}">Accept</button>`
            : "";

        const cancelBtn =
          ["REQUESTED", "QUOTED", "ACCEPTED"].includes(o.status)
            ? `<button class="btn btn-sm btn-outline-danger" data-act="cancel" data-id="${o.id}">Cancel</button>`
            : "";

        const viewBtn = `<button class="btn btn-sm btn-outline-secondary" data-act="view" data-id="${o.id}">View</button>`;

        return `
          <tr>
            <td class="fw-semibold">${label}</td>
            <td>${o.tailorName}</td>
            <td>${o.garment}</td>
            <td>${statusBadge(o.status)}</td>
            <td>${quote}</td>
            <td class="text-muted small">${fmtDate(o.createdAt)}</td>
            <td class="text-end">
              <div class="d-flex justify-content-end gap-2 flex-wrap">
                ${viewBtn}
                ${acceptBtn}
                ${cancelBtn}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function refreshOrders() {
    const u = state.user;

    if (!u?.id) {
      state.orders = [];
      state.summary = null;
      renderOrdersSummary();
      renderOrdersTable("ALL");
      renderOrdersPreview();
      return;
    }

    try {
      const sumRes = await api(`/api/orders/customer/summary?userId=${encodeURIComponent(u.id)}`, { method: "GET" });
      state.summary = sumRes?.summary || null;
    } catch {
      state.summary = null;
    }

    const list = await api(`/api/orders/by-customer?userId=${encodeURIComponent(u.id)}`, { method: "GET" });
    state.orders = normalizeOrders(list);

    renderOrdersSummary();
    const currentFilter = $("poStatusFilter")?.value || "ALL";
    renderOrdersTable(currentFilter);
    renderOrdersPreview();
  }

  async function acceptQuote(orderId) {
    await api(`/api/orders/${encodeURIComponent(orderId)}/accept`, { method: "POST", body: "{}" });
  }

  async function cancelOrder(orderId) {
    await api(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED", note: "Cancelled by customer" }),
    });
  }

  function bindOrdersUI() {
    $("poStatusFilter")?.addEventListener("change", () => {
      renderOrdersTable($("poStatusFilter").value);
    });

    $("poOrdersTbody")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;

      const act = btn.getAttribute("data-act");
      const id = btn.getAttribute("data-id");
      const order = state.orders.find((o) => String(o.id) === String(id));
      if (!order) return;

      try {
        setMsg("poMsg", "", "muted");
        btn.disabled = true;

        if (act === "view") {
          window.location.href = "customer-dashboard.html";
          return;
        }

        if (act === "accept") {
          await acceptQuote(order.id);
          setMsg("poMsg", "✅ Quote accepted.", "success");
        }

        if (act === "cancel") {
          if (!confirm("Cancel this order?")) return;
          await cancelOrder(order.id);
          setMsg("poMsg", "✅ Order cancelled.", "success");
        }

        await refreshOrders();
      } catch (err) {
        setMsg("poMsg", `❌ ${err?.message || "Action failed."}`, "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Recent Orders preview
  function renderOrdersPreview(filtered = null) {
    const el = $("ordersPreview");
    if (!el) return;

    const orders = (filtered || state.orders).slice(0, 3);

    if (!orders.length) {
      el.innerHTML = `<div class="tc-muted">No orders yet. Start your first order!</div>`;
      return;
    }

    el.innerHTML = orders
      .map(
        (o) => `
      <div class="tc-orderrow">
        <div class="tc-orderrow__left">
          <div><strong>${o.garment}</strong> • <span class="tc-muted">${o.tailorName}</span></div>
          <div class="tc-muted">#${o.id} • ${fmtDate(o.createdAt)}</div>
        </div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          ${statusBadge(o.status)}
          <button class="tc-linkbtn" type="button" data-jump="#tabOrders">Open</button>
        </div>
      </div>
    `
      )
      .join("");
  }

  const searchInput = $("tcSearchInput");
  function applySearch() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    if (!q) return renderOrdersPreview();

    const filtered = state.orders.filter((o) =>
      [o.id, o.garment, o.tailorName, o.status].join(" ").toLowerCase().includes(q)
    );
    renderOrdersPreview(filtered);
  }
  searchInput?.addEventListener("input", applySearch);

  function initUserUI() {
    const u = state.user;

    $("tcUserName") && ($("tcUserName").textContent = (u.name || "User").split(" ")[0]);
    $("tcUserCity") && ($("tcUserCity").textContent = u.cityShort || "—");
    $("tcUserRole") && ($("tcUserRole").textContent = u.role || "customer");
    $("tcAvatar") && ($("tcAvatar").textContent = (u.name || "U").trim()[0].toUpperCase());

    $("valName") && ($("valName").textContent = u.name || "—");
    $("valPhone") && ($("valPhone").textContent = u.phone || "—");
    $("valEmail") && ($("valEmail").textContent = u.email || "—");
    $("valCity") && ($("valCity").textContent = u.cityFull || "—");
  }

  async function loadData() {
    const localUser = window.AuthStore?.getCurrentUser?.() || null;
    state.user = normalizeUser(localUser || { name: "User", role: "customer" });

    // Load addresses from backend, fallback to local
    try {
      await loadAddressesRemote();
    } catch (e) {
      console.warn("Address load failed (using local):", e);
      loadAddressesLocal();
    }

    // Orders (existing)
    try {
      await refreshOrders();
    } catch (e) {
      console.warn("Orders load failed:", e);
      state.orders = [];
      state.summary = null;
      renderOrdersSummary();
      renderOrdersTable("ALL");
      renderOrdersPreview();
      setMsg("poMsg", "Could not load orders. Please try again.", "error");
    }
  }

  (async function init() {
    await loadData();
    initUserUI();

    renderAddressesPreview();
    renderAddressesList();
    bindAddressForm();

    renderOrdersPreview();
    bindOrdersUI();

    updateProgress();
  })();
})();
