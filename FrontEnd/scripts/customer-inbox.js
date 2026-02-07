// FrontEnd/scripts/customer-inbox.js
(() => {
  "use strict";

  const API_BASE = window.API_BASE_URL || "http://localhost:5000";

  const $ = (id) => document.getElementById(id);

  const els = {
    meLabel: $("tcMeLabel"),
    search: $("tcSearch"),
    refresh: $("tcRefresh"),
    tabs: $("tcTabs"),
    wrap: $("tcInboxWrap"),
  };

  let ME = null;
  let TAB = "all";
  let ALL = [];

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtTime(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  async function api(path, options = {}) {
    // Keep your existing AuthStore integration if present
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);

    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  function getMe() {
    // AuthStore is your primary way
    const u = window.AuthStore?.getCurrentUser?.();
    if (u?.id) return { ...u, role: (u.role || "customer").toLowerCase() };

    // fallback: older session key (some pages use it)
    try {
      const raw = localStorage.getItem("tc_current_user_v1");
      if (!raw) return null;
      const s = JSON.parse(raw);
      const user = s?.user && typeof s.user === "object" ? s.user : s;
      if (!user?.id) return null;
      return { ...user, role: (user.role || "customer").toLowerCase() };
    } catch {
      return null;
    }
  }

  async function loadInbox() {
    els.wrap.innerHTML = `
      <div class="tc-empty">
        <p class="small tc-muted mb-0">Loading your chats…</p>
      </div>
    `;

    const userId = ME.id;
    const tab = TAB; // all | inquiries | orders
    const data = await api(`/api/chat/inbox?role=customer&userId=${encodeURIComponent(userId)}&tab=${encodeURIComponent(tab)}`);
    ALL = Array.isArray(data) ? data : [];
  }

  function filterList() {
    const q = String(els.search?.value || "").trim().toLowerCase();
    let list = [...ALL];

    if (q) {
      list = list.filter((c) => {
        const title = String(c.title || "").toLowerCase();
        const sub = String(c.subtitle || "").toLowerCase();
        const orderId = String(c.orderId || "").toLowerCase();
        const last = String(c.lastMessage?.text || "").toLowerCase();
        return title.includes(q) || sub.includes(q) || orderId.includes(q) || last.includes(q);
      });
    }

    // already sorted by backend updatedAt, but safe
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  }

  function render() {
    const list = filterList();

    if (!list.length) {
      els.wrap.innerHTML = `
        <div class="tc-empty">
          <div class="fw-semibold">No chats yet</div>
          <div class="small tc-muted mt-1">
            Start an inquiry from a tailor profile or place an order to open an order chat.
          </div>
        </div>
      `;
      return;
    }

    els.wrap.innerHTML = list
      .map((c) => {
        const title = esc(c.title || "Conversation");
        const subtitle = esc(c.subtitle || "");
        const lastText =
          c.lastMessage?.kind === "image"
            ? "🖼️ Photo"
            : c.lastMessage?.kind === "video"
            ? "🎥 Video"
            : c.lastMessage?.kind === "file"
            ? "📎 File"
            : esc(c.lastMessage?.text || "Say hi 👋");

        const t = c.lastMessage?.createdAt ? fmtTime(c.lastMessage.createdAt) : "";

        const avatarLetter = (c.title || "T").trim().charAt(0).toUpperCase();

        return `
          <div class="tc-inbox-item" data-cid="${esc(c.id)}">
            <div class="d-flex align-items-center gap-3">
              <div class="tc-avatar">${esc(avatarLetter)}</div>
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div class="fw-semibold">${title}</div>
                  <div class="small tc-muted">${esc(t)}</div>
                </div>
                <div class="tc-small tc-muted">${subtitle}</div>
                <div class="tc-small mt-1">${lastText}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function setActiveTab(tab) {
    TAB = tab;
    const btns = els.tabs?.querySelectorAll("button.nav-link[data-tab]") || [];
    btns.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  }

  async function refresh() {
    try {
      await loadInbox();
      render();
    } catch (e) {
      els.wrap.innerHTML = `
        <div class="tc-empty">
          <div class="fw-semibold text-danger">Failed to load chats</div>
          <div class="small tc-muted mt-1">${esc(e?.message || e)}</div>
        </div>
      `;
    }
  }

  async function init() {
    ME = getMe();
    if (!ME) {
      // not logged in: send to login
      window.location.href = "login.html";
      return;
    }

    // customer only
    if ((ME.role || "").toLowerCase() !== "customer") {
      // if tailor opened it by mistake
      window.location.href = "tailor-dashboard.html";
      return;
    }

    if (els.meLabel) els.meLabel.textContent = ME.email || ME.name || "Customer";

    // tab click
    els.tabs?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-tab]");
      if (!btn) return;
      setActiveTab(btn.dataset.tab);
      await refresh();
    });

    // search
    els.search?.addEventListener("input", () => render());

    // refresh
    els.refresh?.addEventListener("click", () => refresh());

    // open conversation
    els.wrap?.addEventListener("click", (e) => {
      const row = e.target.closest(".tc-inbox-item[data-cid]");
      if (!row) return;
      const cid = row.dataset.cid;
      window.location.href = `customer-chat.html?cid=${encodeURIComponent(cid)}`;
    });

    setActiveTab("all");
    await refresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
