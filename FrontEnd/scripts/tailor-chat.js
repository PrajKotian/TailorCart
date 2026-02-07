// FrontEnd/scripts/tailor-chat.js
(function () {
  "use strict";

  const API_BASE = window.API_BASE_URL || "http://localhost:5000";
  const SESSION_KEY = "tc_current_user_v1";

  const $ = (id) => document.getElementById(id);

  const els = {
    orderIdLabel: $("tcOrderIdLabel"),
    tailorLabel: $("tcTailorLabel"),
    backBtn: $("tcBackBtn"),
    refreshBtn: $("tcRefreshBtn"),
    chatWrap: $("tcChatWrap"),
    form: $("tcChatForm"),
    input: $("tcChatInput"),
    sendBtn: $("tcSendBtn"),
    notice: $("tcNotice"),
  };

  let currentUser = null;
  let myTailor = null;
  let orderId = null;

  let conversationId = null;
  let pollTimer = null;
  let lastRenderKey = "";

  function showNotice(type, msg) {
    if (!els.notice) return;
    els.notice.style.display = "block";
    els.notice.className = `alert alert-${type} py-2 mb-0`;
    els.notice.textContent = msg;
  }

  function clearNotice() {
    if (!els.notice) return;
    els.notice.style.display = "none";
    els.notice.textContent = "";
    els.notice.className = "";
  }

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
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function getSessionUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const s = JSON.parse(raw);
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

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function api(path, options = {}) {
    // If you later add AuthStore, this will automatically use it.
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);

    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  function parseParams() {
    const u = new URL(window.location.href);
    orderId = u.searchParams.get("orderId");
  }

  async function fetchAllTailors() {
    const res = await fetch(`${API_BASE}/api/tailors`);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || "Failed to load tailors");
    return Array.isArray(data) ? data : [];
  }

  async function resolveMyTailor() {
    const tailors = await fetchAllTailors();
    const t = tailors.find((x) => String(x.userId) === String(currentUser.id)) || null;
    if (!t) throw new Error("Tailor profile not linked to this login.");
    return t;
  }

  async function createOrGetConversation() {
    // ORDER conversation tied to orderId
    const data = await api("/api/chat/conversations", {
      method: "POST",
      body: JSON.stringify({
        type: "ORDER",
        orderId,
        role: "tailor",
        userId: currentUser.id,
        tailorId: myTailor.id, // important for backend access check
      }),
    });

    if (!data?.conversation?.id) throw new Error("Could not open conversation.");
    conversationId = data.conversation.id;
  }

  async function markRead() {
    if (!conversationId) return;
    try {
      await api(`/api/chat/read/${encodeURIComponent(conversationId)}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "tailor" }),
      });
    } catch {
      // non-blocking
    }
  }

  function renderMessages(list) {
    if (!els.chatWrap) return;

    const key = JSON.stringify(list.map((m) => [m.id, m.text, m.createdAt, m.senderRole]));
    if (key === lastRenderKey) return;
    lastRenderKey = key;

    if (!list.length) {
      els.chatWrap.innerHTML = `<p class="small text-muted mb-0">No messages yet. Say hi 👋</p>`;
      return;
    }

    els.chatWrap.innerHTML = list
      .map((m) => {
        const mine = String(m.senderRole) === "tailor";
        const who = mine ? "You" : "Customer";
        return `
          <div class="msg-row ${mine ? "me" : ""}">
            <div class="msg-bubble">
              <div>${esc(m.text)}</div>
              <div class="msg-meta">${esc(who)} · ${esc(fmtTime(m.createdAt))}</div>
            </div>
          </div>
        `;
      })
      .join("");

    // auto-scroll to bottom
    els.chatWrap.scrollTop = els.chatWrap.scrollHeight;
  }

  async function loadMessages() {
    if (!conversationId) return;
    const list = await api(`/api/chat/messages/${encodeURIComponent(conversationId)}`);
    renderMessages(Array.isArray(list) ? list : []);
    await markRead();
  }

  async function sendMessage(text) {
    if (!conversationId) throw new Error("Chat not ready.");
    const t = String(text || "").trim();
    if (!t) return;

    await api("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify({
        conversationId,
        senderRole: "tailor",
        senderId: currentUser.id,
        text: t,
      }),
    });
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      loadMessages().catch(() => {});
    }, 2000);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  async function init() {
    parseParams();

    currentUser = getSessionUser();
    if (!currentUser || currentUser.role !== "tailor") {
      window.location.href = "login-tailor.html";
      return;
    }

    if (!orderId) {
      showNotice("danger", "Missing orderId in URL. Open chat from Orders page.");
      return;
    }

    // Back button should focus the same order on return
    if (els.backBtn) {
      els.backBtn.href = `tailor-orders.html?focus=${encodeURIComponent(orderId)}`;
    }

    clearNotice();
    if (els.orderIdLabel) els.orderIdLabel.textContent = `#${orderId}`;

    // resolve tailor profile tied to login
    myTailor = await resolveMyTailor();
    if (els.tailorLabel) els.tailorLabel.textContent = myTailor.name || "Tailor";

    // open conversation
    await createOrGetConversation();

    // initial load + polling
    await loadMessages();
    startPolling();

    // manual refresh
    els.refreshBtn?.addEventListener("click", async () => {
      try {
        els.refreshBtn.disabled = true;
        els.refreshBtn.textContent = "Refreshing...";
        await loadMessages();
      } catch (e) {
        showNotice("danger", e?.message || "Failed to refresh.");
      } finally {
        els.refreshBtn.disabled = false;
        els.refreshBtn.textContent = "Refresh";
      }
    });

    // send
    els.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearNotice();

      const text = els.input?.value || "";
      if (!String(text).trim()) return;

      try {
        els.sendBtn.disabled = true;
        await sendMessage(text);
        if (els.input) els.input.value = "";
        await loadMessages();
      } catch (err) {
        showNotice("danger", err?.message || "Could not send message.");
      } finally {
        els.sendBtn.disabled = false;
      }
    });

    // stop polling if tab closes
    window.addEventListener("beforeunload", stopPolling);
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => showNotice("danger", e?.message || "Failed to open chat."));
  });
})();
