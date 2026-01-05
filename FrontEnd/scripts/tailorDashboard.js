// FrontEnd/scripts/tailorDashboard.js
(() => {
  const API = window.API_BASE_URL || "http://localhost:5000";

  // ---------- Helpers ----------
  function readSession() {
    try {
      const raw = localStorage.getItem("tc_current_user_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function redirectToLogin() {
    // we are inside /pages/, guards already do this, but keep it safe
    window.location.href = "login.html?role=tailor";
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function getTailorByUserId(userId) {
    // preferred endpoint (we’ll add in backend)
    try {
      const res = await fetch(`${API}/api/tailors/by-user/${userId}`);
      if (!res.ok) return null;
      return await safeJson(res);
    } catch {
      return null;
    }
  }

  function calcProfileCompletion(t) {
    if (!t) return 0;

    const checks = [
      Boolean(t.name),
      Boolean(t.city),
      Boolean(t.area),
      Number(t.experienceYears) > 0,
      Boolean(t.about),
      Number(t.startingPrice) > 0,
      Boolean(t.profileImageUrl),
      Array.isArray(t.specializations) && t.specializations.length > 0,
      Array.isArray(t.services) && t.services.length > 0,
    ];

    const done = checks.filter(Boolean).length;
    const total = checks.length;
    return Math.round((done / total) * 100);
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

    el.innerHTML = `<div class="${cls} py-2 px-3 mb-0">${html}</div>`;
  }

  // ---------- Main ----------
  async function init() {
    const session = readSession();
    const role = String(session?.activeRole || session?.role || "").toLowerCase();

    if (!session || role !== "tailor") {
      redirectToLogin();
      return;
    }

    // Basic UI
    setText("tcTailorEmail", session.email || "—");

    // Edit button -> shop edit page
    const editBtn = document.getElementById("tcEditShopBtn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        window.location.href = "tailor-shop-edit.html";
      });
    }

    // Load tailor profile
    const tailor = await getTailorByUserId(session.id);

    if (!tailor) {
      // No profile yet
      setText("tcTailorCity", session.city || "City");
      setText("tcProfilePct", "0%");
      const bar = document.getElementById("tcProfileBar");
      if (bar) bar.style.width = "0%";
      const hint = document.getElementById("tcProfileHint");
      if (hint) hint.textContent = "Tip: Create your shop profile to start receiving orders.";

      setNotice(
        `You haven't created your shop profile yet. Click <b>Edit Shop Profile</b> to add details.`,
        "info"
      );

      // Stats
      setText("tcNewRequests", "0");
      setText("tcActiveOrders", "0");

      const recent = document.getElementById("tcRecentOrders");
      if (recent) recent.innerHTML = `<p class="small text-muted mb-0">No requests yet.</p>`;
      return;
    }

    // City from profile
    setText("tcTailorCity", tailor.city || "City");

    // Completion
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

    // Stats + recent (needs OrderStore + tailorId)
    let newRequests = 0;
    let activeOrders = 0;
    let recentHtml = `<p class="small text-muted mb-0">No requests yet.</p>`;

    try {
      if (window.OrderStore?.getOrdersByTailor) {
        const orders = await window.OrderStore.getOrdersByTailor(tailor.id);

        const status = window.ORDER_STATUS || {};
        newRequests = orders.filter((o) => o.status === status.REQUESTED).length;
        activeOrders = orders.filter((o) =>
          [status.QUOTED, status.ACCEPTED, status.IN_PROGRESS, status.READY].includes(o.status)
        ).length;

        const top = orders
          .slice()
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 5);

        if (top.length) {
          recentHtml = `
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
                    .map(
                      (o) => `
                    <tr>
                      <td class="fw-semibold">#${o.id}</td>
                      <td>${o.garmentType || "—"}</td>
                      <td>${o.status || "—"}</td>
                      <td class="text-end">
                        <a href="tailor-orders.html" style="text-decoration:none;">Open →</a>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `;
        }
      }
    } catch (e) {
      console.warn("Tailor dashboard orders load failed:", e);
    }

    setText("tcNewRequests", String(newRequests));
    setText("tcActiveOrders", String(activeOrders));

    const recent = document.getElementById("tcRecentOrders");
    if (recent) recent.innerHTML = recentHtml;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
