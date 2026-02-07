// FrontEnd/scripts/tailorDashboard.js
(() => {
  "use strict";

  // ---------------------------
  // API BASE (same style as main.js)
  // ---------------------------
  const API =
    (window.API_BASE_URL && String(window.API_BASE_URL).replace(/\/$/, "")) ||
    (() => {
      const meta = document.querySelector('meta[name="tc-api-base"]');
      const metaUrl = meta?.getAttribute("content")?.trim();
      return (metaUrl ? metaUrl : "http://localhost:3000").replace(/\/$/, "");
    })();

  const SESSION_KEY = "tc_current_user_v1";

  // ---------------------------
  // Helpers
  // ---------------------------
  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getSessionUser() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const s = safeParse(raw);
    if (!s || typeof s !== "object") return null;

    const u = s.user && typeof s.user === "object" ? s.user : s;

    const role = String(u.role ?? s.role ?? s.activeRole ?? "").toLowerCase().trim();

    return {
      ...u,
      id: u.id ?? s.id ?? null,
      email: u.email ?? s.email ?? "",
      name: u.name ?? s.name ?? u.fullName ?? u.username ?? "Tailor",
      role,
    };
  }

  function redirectToLogin() {
    const redirectTo = encodeURIComponent(window.location.href);
    window.location.href = `login.html?role=tailor&redirect=${redirectTo}`;
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function apiFetch(path, options = {}) {
    // Prefer AuthStore if present
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);

    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setNotice(html, type = "info") {
    const el = document.getElementById("tcNotice");
    if (!el) return;

    const cls =
      type === "success"
        ? "alert alert-success"
        : type === "error"
        ? "alert alert-danger"
        : "alert alert-info";

    el.style.display = "block";
    el.innerHTML = `<div class="${cls} py-2 px-3 mb-0">${html}</div>`;
  }

  function hideNotice() {
    const el = document.getElementById("tcNotice");
    if (!el) return;
    el.style.display = "none";
    el.innerHTML = "";
  }

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function calcProfileCompletion(t) {
    if (!t) return 0;

    // Area + services are optional in many cases, so don't punish too hard.
    const checks = [
      Boolean(t.name),
      Boolean(t.city),
      toNum(t.experienceYears) > 0,
      toNum(t.startingPrice) > 0,
      Boolean(t.about),
      // optional-ish but still counts:
      Boolean(t.area),
      Boolean(t.profileImageUrl),
      Array.isArray(t.specializations) && t.specializations.length > 0,
      Array.isArray(t.services) && t.services.length > 0,
    ];

    const done = checks.filter(Boolean).length;
    const total = checks.length;
    return Math.round((done / total) * 100);
  }

  function statusLabel(status) {
    const s = String(status || "").toUpperCase();
    const map = {
      REQUESTED: "REQUESTED",
      QUOTED: "QUOTED",
      ACCEPTED: "ACCEPTED",
      IN_PROGRESS: "IN_PROGRESS",
      READY: "READY",
      DELIVERED: "DELIVERED",
      CANCELLED: "CANCELLED",
    };
    return map[s] || s || "—";
  }

  function sortByCreatedDesc(a, b) {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    if (db !== da) return db - da;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  }

  // ---------------------------
  // Backend calls
  // ---------------------------
  async function getTailorByUserId(userId) {
    try {
      const res = await fetch(`${API}/api/tailors/by-user/${encodeURIComponent(String(userId))}`);
      if (!res.ok) return null;
      return await safeJson(res);
    } catch {
      return null;
    }
  }

  async function createTailorProfile(payload) {
    // POST /api/tailors
    return apiFetch("/api/tailors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function updateTailorProfile(tailorId, payload) {
    // PUT /api/tailors/:id
    return apiFetch(`/api/tailors/${encodeURIComponent(String(tailorId))}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  // ---------------------------
  // UI: Shop modal wiring
  // ---------------------------
  const modalEl = document.getElementById("tcShopModal");
  const shopForm = document.getElementById("tcShopForm");
  const shopMsg = document.getElementById("tcShopMsg");

  const shopInputs = {
    name: document.getElementById("tcShopName"),
    city: document.getElementById("tcShopCity"),
    area: document.getElementById("tcShopArea"),
    exp: document.getElementById("tcShopExp"),
    price: document.getElementById("tcShopPrice"),
    about: document.getElementById("tcShopAbout"),
  };

  const shopModal = modalEl ? new bootstrap.Modal(modalEl) : null;

  function setShopMsg(text = "", type = "muted") {
    if (!shopMsg) return;
    shopMsg.className =
      "small " +
      (type === "error" ? "text-danger" : type === "success" ? "text-success" : "text-muted");
    shopMsg.textContent = text;
  }

  function fillShopForm(tailor, sessionUser) {
    if (shopInputs.name) shopInputs.name.value = tailor?.name || sessionUser?.name || "";
    if (shopInputs.city) shopInputs.city.value = tailor?.city || "";
    if (shopInputs.area) shopInputs.area.value = tailor?.area || "";
    if (shopInputs.exp) shopInputs.exp.value = tailor?.experienceYears ?? "";
    if (shopInputs.price) shopInputs.price.value = tailor?.startingPrice ?? "";
    if (shopInputs.about) shopInputs.about.value = tailor?.about || "";
  }

  function readShopForm() {
    return {
      name: (shopInputs.name?.value || "").trim(),
      city: (shopInputs.city?.value || "").trim(),
      area: (shopInputs.area?.value || "").trim(),
      experienceYears: toNum(shopInputs.exp?.value),
      startingPrice: toNum(shopInputs.price?.value),
      about: (shopInputs.about?.value || "").trim(),
    };
  }

  // ---------------------------
  // Render dashboard parts
  // ---------------------------
  function renderProfileCard(tailor, sessionUser) {
    setText("tcTailorEmail", sessionUser?.email || "—");
    setText("tcTailorCity", tailor?.city || "City");

    const pct = calcProfileCompletion(tailor);
    setText("tcProfilePct", `${pct}%`);

    const bar = document.getElementById("tcProfileBar");
    if (bar) bar.style.width = `${pct}%`;

    const hint = document.getElementById("tcProfileHint");
    if (hint) {
      hint.textContent =
        pct >= 80
          ? "Nice! Your profile looks strong. Keep orders updated for trust."
          : "Tip: Add services, starting price, and a profile photo to boost trust.";
    }
  }

  function renderStatsFromOrders(orders) {
    const S = window.ORDER_STATUS || {
      REQUESTED: "REQUESTED",
      QUOTED: "QUOTED",
      ACCEPTED: "ACCEPTED",
      IN_PROGRESS: "IN_PROGRESS",
      READY: "READY",
      DELIVERED: "DELIVERED",
      CANCELLED: "CANCELLED",
    };

    const newRequests = orders.filter((o) => String(o.status) === S.REQUESTED).length;

    const activeOrders = orders.filter((o) =>
      [S.QUOTED, S.ACCEPTED, S.IN_PROGRESS, S.READY].includes(String(o.status))
    ).length;

    setText("tcNewRequests", String(newRequests));
    setText("tcActiveOrders", String(activeOrders));
  }

  function renderRecentOrders(orders) {
    const recent = document.getElementById("tcRecentOrders");
    if (!recent) return;

    const top = orders.slice().sort(sortByCreatedDesc).slice(0, 5);

    if (!top.length) {
      recent.innerHTML = `<p class="small text-muted mb-0">No requests yet.</p>`;
      return;
    }

    recent.innerHTML = `
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr>
              <th>Order</th>
              <th>Garment</th>
              <th>Status</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            ${top
              .map((o) => {
                const id = o.id ?? o.orderId ?? "—";
                const garment = o.garmentType || o.garment || "—";
                const st = statusLabel(o.status);
                return `
                  <tr>
                    <td class="fw-semibold">#${id}</td>
                    <td>${garment}</td>
                    <td>${st}</td>
                    <td class="text-end">
                      <a href="tailor-orders.html?focus=${encodeURIComponent(String(id))}" style="text-decoration:none;">
                        Open →
                      </a>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---------------------------
  // Main init
  // ---------------------------
  async function init() {
    hideNotice();

    // Must have session
    const sessionUser = getSessionUser();
    if (!sessionUser || sessionUser.role !== "tailor") {
      redirectToLogin();
      return;
    }

    // Help button -> WhatsApp (optional)
    const helpBtn = document.getElementById("tcHelpBtn");
    helpBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      window.open("https://wa.me/919999999999?text=Hi%20TailorCart%20Support", "_blank");
    });

    // Load tailor profile linked with userId
    let tailor = await getTailorByUserId(sessionUser.id);

    // Hook edit button to modal (NOT redirect)
    const editBtn = document.getElementById("tcEditShopBtn");
    editBtn?.addEventListener("click", () => {
      if (!shopModal) return;
      setShopMsg("");
      fillShopForm(tailor, sessionUser);
      shopModal.show();
    });

    // If no profile yet
    if (!tailor) {
      setText("tcTailorEmail", sessionUser.email || "—");
      setText("tcTailorCity", "City");
      setText("tcProfilePct", "0%");

      const bar = document.getElementById("tcProfileBar");
      if (bar) bar.style.width = "0%";

      const hint = document.getElementById("tcProfileHint");
      if (hint) hint.textContent = "Tip: Create your shop profile to start receiving orders.";

      setText("tcNewRequests", "0");
      setText("tcActiveOrders", "0");

      const recent = document.getElementById("tcRecentOrders");
      if (recent) recent.innerHTML = `<p class="small text-muted mb-0">No requests yet.</p>`;

      setNotice(
        `You haven't created your shop profile yet. Click <b>Edit Shop Profile</b> and save your details.`,
        "info"
      );
    } else {
      renderProfileCard(tailor, sessionUser);
    }

    // Save shop profile (create or update)
    shopForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      setShopMsg("");

      const values = readShopForm();
      if (!values.name || !values.city) {
        setShopMsg("Please enter at least Name and City.", "error");
        return;
      }

      try {
        setShopMsg("Saving...", "muted");

        if (!tailor) {
          // create profile
          tailor = await createTailorProfile({
            userId: String(sessionUser.id),
            name: values.name,
            email: sessionUser.email || "",
            city: values.city,
            area: values.area,
            experienceYears: values.experienceYears,
            startingPrice: values.startingPrice,
            about: values.about,
            // keep these empty for now (you can add later in profile page)
            specializations: [],
            services: [],
            gender: "",
            rating: 4.5,
            profileImageUrl: "",
          });

          setShopMsg("✅ Profile created!", "success");
          setNotice("✅ Shop profile created successfully.", "success");
        } else {
          // update profile
          tailor = await updateTailorProfile(tailor.id, {
            name: values.name,
            city: values.city,
            area: values.area,
            experienceYears: values.experienceYears,
            startingPrice: values.startingPrice,
            about: values.about,
          });

          setShopMsg("✅ Saved!", "success");
          setNotice("✅ Shop profile updated successfully.", "success");
        }

        // re-render profile card
        renderProfileCard(tailor, sessionUser);

        // close modal
        setTimeout(() => shopModal?.hide(), 400);
      } catch (err) {
        setShopMsg(`❌ ${err.message || "Save failed"}`, "error");
      }
    });

    // Load orders stats + recent (needs OrderStore)
    try {
      if (!tailor || !tailor.id) return;

      if (window.OrderStore?.getOrdersByTailor) {
        const orders = await window.OrderStore.getOrdersByTailor(tailor.id);
        const list = Array.isArray(orders) ? orders : [];

        renderStatsFromOrders(list);
        renderRecentOrders(list);
      } else {
        // no OrderStore loaded
        renderStatsFromOrders([]);
        renderRecentOrders([]);
      }
    } catch (err) {
      console.warn("Dashboard orders load failed:", err);
      renderStatsFromOrders([]);
      renderRecentOrders([]);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
