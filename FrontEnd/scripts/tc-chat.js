// FrontEnd/scripts/tc-chat.js
(() => {
  const API_BASE = window.API_BASE_URL || "http://localhost:5000";
  const SESSION_KEY = "tc_current_user_v1";

  const els = {
    roleLine: document.getElementById("tcChatRoleLine"),
    refreshBtn: document.getElementById("tcRefreshInboxBtn"),
    search: document.getElementById("tcInboxSearch"),
    sections: document.getElementById("tcInboxSections"),

    title: document.getElementById("tcChatTitle"),
    subtitle: document.getElementById("tcChatSubtitle"),
    typeBadge: document.getElementById("tcChatTypeBadge"),

    msgs: document.getElementById("tcMsgs"),
    input: document.getElementById("tcMsgInput"),
    send: document.getElementById("tcSendBtn"),
    file: document.getElementById("tcFile"),
  };

  let me = null; // {id, role, name, email}
  let inbox = { all: [], inquiry: [], orders: [], tailorDM: [] };
  let activeConv = null;
  let pollTimer = null;

  function normalizeRole(r) {
    return String(r || "").toLowerCase();
  }

  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getSessionUser() {
    // Try AuthStore first
    const u = window.AuthStore?.getCurrentUser?.();
    if (u?.id && (u?.role || u?.activeRole)) {
      return {
        id: u.id,
        role: normalizeRole(u.activeRole || u.role),
        name: u.name || "User",
        email: u.email || "",
      };
    }

    // fallback local storage (tailorOrders style)
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = safeParse(raw, null);
    const uu = s?.user && typeof s.user === "object" ? s.user : s;

    return {
      id: uu?.id ?? s?.id ?? null,
      role: normalizeRole(uu?.role ?? s?.role),
      name: uu?.name ?? s?.name ?? "User",
      email: uu?.email ?? s?.email ?? "",
    };
  }

  async function api(path, options = {}) {
    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  function fmtTime(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
    } catch {
      return "";
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

  function convLabel(c) {
    const type = String(c.type || "").toUpperCase();
    if (type === "ORDER") return c.orderId ? `Order #${c.orderId}` : "Order Chat";
    if (type === "INQUIRY") return "Inquiry";
    if (type === "TAILOR_DM") return "Tailor DM";
    return "Chat";
  }

  function otherPartyLabel(c) {
    const parts = Array.isArray(c.participants) ? c.participants : [];
    const other = parts.find((p) => normalizeRole(p.role) !== me.role || String(p.id) !== String(me.id));
    if (!other) return "Chat";
    return `${other.role} #${other.id}`;
  }

  function splitSectionsForUI() {
    const role = me.role;
    const all = inbox.all || [];

    if (role === "tailor") {
      return [
        { title: "Orders", key: "orders", list: inbox.orders || [] },
        { title: "Inquiries", key: "inquiry", list: inbox.inquiry || [] },
        { title: "Tailor DM", key: "tailorDM", list: inbox.tailorDM || [] },
      ];
    }
    return [{ title: "All Chats", key: "all", list: all }];
  }

  function renderInbox() {
    const q = (els.search?.value || "").trim().toLowerCase();

    const sections = splitSectionsForUI();

    els.sections.innerHTML = sections
      .map((sec) => {
        const list = (sec.list || []).filter((c) => {
          if (!q) return true;
          const a = `${convLabel(c)} ${otherPartyLabel(c)} ${c?.lastMessage?.text || ""}`.toLowerCase();
          return a.includes(q);
        });

        const itemsHtml = list.length
          ? list
              .map((c) => {
                const active = activeConv && String(activeConv.id) === String(c.id);
                const last = c.lastMessage;
                const lastLine =
                  last?.type === "text"
                    ? (last.text || "").slice(0, 60)
                    : last?.type
                    ? `[${last.type}]`
                    : "No messages yet";

                return `
                  <div class="tc-chat-item ${active ? "is-active" : ""}" data-cid="${c.id}">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                      <div>
                        <div class="fw-semibold">${esc(otherPartyLabel(c))}</div>
                        <div class="small text-muted">${esc(convLabel(c))}</div>
                      </div>
                      <span class="tc-chat-badge">${esc(String(c.type || "").toUpperCase())}</span>
                    </div>
                    <div class="small text-muted mt-2">${esc(lastLine)}</div>
                    <div class="tc-meta mt-1">${last?.createdAt ? esc(fmtTime(last.createdAt)) : ""}</div>
                  </div>
                `;
              })
              .join("")
          : `<div class="small text-muted">No chats</div>`;

        return `
          <div class="mb-3">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="fw-semibold">${esc(sec.title)}</div>
              <div class="small text-muted">${list.length}</div>
            </div>
            <div class="d-grid gap-2">${itemsHtml}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderHeader(c) {
    if (!c) {
      els.title.textContent = "Select a chat";
      els.subtitle.textContent = "—";
      els.typeBadge.textContent = "—";
      return;
    }

    els.title.textContent = otherPartyLabel(c);
    els.subtitle.textContent = convLabel(c);
    els.typeBadge.textContent = String(c.type || "").toUpperCase();
  }

  function bubbleHtml(m) {
    const isMe = normalizeRole(m.senderRole) === me.role && String(m.senderId) === String(me.id);
    const cls = isMe ? "tc-bubble tc-me" : "tc-bubble tc-them";

    let body = "";
    if (m.type === "text") {
      body = `<div>${esc(m.text || "")}</div>`;
    } else if (m.type === "image") {
      body = `
        <div class="mb-1"><span class="tc-chat-badge">IMAGE</span></div>
        <img src="${esc(m.mediaDataUrl)}" alt="image" style="max-width:100%; border-radius:12px; border:1px solid rgba(15,23,42,.10);" />
      `;
    } else if (m.type === "video") {
      body = `
        <div class="mb-1"><span class="tc-chat-badge">VIDEO</span></div>
        <video controls style="max-width:100%; border-radius:12px; border:1px solid rgba(15,23,42,.10);">
          <source src="${esc(m.mediaDataUrl)}" />
        </video>
      `;
    }

    return `
      <div class="d-flex flex-column gap-1 mb-2">
        <div class="${cls}">
          ${body}
        </div>
        <div class="tc-meta ${isMe ? "text-end" : ""}">
          ${esc(fmtTime(m.createdAt))} • ${esc(String(m.senderRole || ""))}
        </div>
      </div>
    `;
  }

  function scrollToBottom() {
    if (!els.msgs) return;
    els.msgs.scrollTop = els.msgs.scrollHeight;
  }

  async function loadMessages(conversationId, keepScroll = false) {
    const data = await api(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
    const list = Array.isArray(data.messages) ? data.messages : [];

    const prevBottom = els.msgs.scrollHeight - els.msgs.scrollTop - els.msgs.clientHeight;

    els.msgs.innerHTML = list.length
      ? list.map(bubbleHtml).join("")
      : `<div class="small text-muted">No messages yet. Say hi 👋</div>`;

    if (keepScroll && prevBottom < 80) scrollToBottom();
    if (!keepScroll) scrollToBottom();
  }

  async function openConversation(c) {
    activeConv = c;
    renderHeader(activeConv);
    renderInbox();
    await loadMessages(activeConv.id);

    // start polling (simple)
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!activeConv) return;
      loadMessages(activeConv.id, true).catch(() => {});
    }, 2500);
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(new Error("File read failed"));
      fr.readAsDataURL(file);
    });
  }

  async function sendText() {
    if (!activeConv) return alert("Select a chat first.");
    const text = String(els.input.value || "").trim();
    if (!text) return;

    els.send.disabled = true;
    try {
      await api(`/api/chat/conversations/${encodeURIComponent(activeConv.id)}/messages`, {
        method: "POST",
        body: JSON.stringify({
          senderRole: me.role,
          senderId: me.id,
          type: "text",
          text,
        }),
      });
      els.input.value = "";
      await loadMessages(activeConv.id, true);
      await refreshInbox(true);
    } catch (e) {
      alert(e?.message || "Send failed");
    } finally {
      els.send.disabled = false;
    }
  }

  async function sendMedia(file) {
    if (!activeConv) return alert("Select a chat first.");
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return alert("Only image/video supported");

    // demo safety limit (your express JSON is 10mb)
    if (file.size > 8 * 1024 * 1024) return alert("File too large for demo. Use <= 8MB.");

    els.send.disabled = true;
    try {
      const dataUrl = await readAsDataURL(file);
      await api(`/api/chat/conversations/${encodeURIComponent(activeConv.id)}/messages`, {
        method: "POST",
        body: JSON.stringify({
          senderRole: me.role,
          senderId: me.id,
          type: isVideo ? "video" : "image",
          mediaDataUrl: dataUrl,
          fileName: file.name || null,
        }),
      });

      els.file.value = "";
      await loadMessages(activeConv.id, true);
      await refreshInbox(true);
    } catch (e) {
      alert(e?.message || "Upload failed");
    } finally {
      els.send.disabled = false;
    }
  }

  async function refreshInbox(keepActive = false) {
    const data = await api(`/api/chat/conversations?role=${encodeURIComponent(me.role)}&userId=${encodeURIComponent(me.id)}`);

    if (me.role === "tailor") {
      inbox = {
        inquiry: Array.isArray(data.inquiry) ? data.inquiry : [],
        orders: Array.isArray(data.orders) ? data.orders : [],
        tailorDM: Array.isArray(data.tailorDM) ? data.tailorDM : [],
        all: Array.isArray(data.all) ? data.all : [],
      };
    } else {
      inbox = { all: Array.isArray(data.all) ? data.all : [] };
    }

    if (!keepActive) activeConv = null;
    renderHeader(activeConv);
    renderInbox();
  }

  // Auto open from URL:
  // tc-chat.html?cid=12
  // tc-chat.html?orderId=7&customerId=1&tailorId=2&type=ORDER
  // tc-chat.html?tailorId=2&type=INQUIRY (customer inquiry)
  async function handleAutoOpenFromUrl() {
    const u = new URL(window.location.href);
    const cid = u.searchParams.get("cid");
    if (cid) {
      const all = inbox.all || [];
      const found = all.find((c) => String(c.id) === String(cid));
      if (found) return openConversation(found);
      // if not in inbox yet, just refresh once
      await refreshInbox(true);
      const all2 = inbox.all || [];
      const found2 = all2.find((c) => String(c.id) === String(cid));
      if (found2) return openConversation(found2);
      return;
    }

    const type = String(u.searchParams.get("type") || "").toUpperCase();
    if (!type) return;

    if (type === "INQUIRY") {
      const tailorId = Number(u.searchParams.get("tailorId"));
      if (!tailorId) return;

      // must be customer creating inquiry
      if (me.role !== "customer") return;

      const resp = await api(`/api/chat/conversations/find-or-create`, {
        method: "POST",
        body: JSON.stringify({
          type: "INQUIRY",
          customerId: Number(me.id),
          tailorId,
        }),
      });

      await refreshInbox(true);
      const conv = resp?.conversation;
      if (conv?.id) return openConversation(conv);
    }

    if (type === "ORDER") {
      const orderId = Number(u.searchParams.get("orderId"));
      const customerId = Number(u.searchParams.get("customerId"));
      const tailorId = Number(u.searchParams.get("tailorId"));
      if (!orderId || !customerId || !tailorId) return;

      // both tailor and customer can open, but we need correct ids
      const resp = await api(`/api/chat/conversations/find-or-create`, {
        method: "POST",
        body: JSON.stringify({
          type: "ORDER",
          orderId,
          customerId,
          tailorId,
        }),
      });

      await refreshInbox(true);
      const conv = resp?.conversation;
      if (conv?.id) return openConversation(conv);
    }

    if (type === "TAILOR_DM") {
      const otherTailorId = Number(u.searchParams.get("otherTailorId"));
      if (!otherTailorId) return;
      if (me.role !== "tailor") return;

      const resp = await api(`/api/chat/conversations/find-or-create`, {
        method: "POST",
        body: JSON.stringify({
          type: "TAILOR_DM",
          tailorId: Number(me.id),
          otherTailorId,
        }),
      });

      await refreshInbox(true);
      const conv = resp?.conversation;
      if (conv?.id) return openConversation(conv);
    }
  }

  function bindUI() {
    els.refreshBtn?.addEventListener("click", () => refreshInbox(true).catch(console.error));
    els.search?.addEventListener("input", () => renderInbox());

    els.sections?.addEventListener("click", async (e) => {
      const item = e.target.closest("[data-cid]");
      if (!item) return;
      const cid = item.getAttribute("data-cid");

      const all = inbox.all || [];
      const found = all.find((c) => String(c.id) === String(cid));
      if (!found) return;

      await openConversation(found);
    });

    els.send?.addEventListener("click", () => sendText());
    els.input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendText();
    });

    els.file?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      sendMedia(file).catch(console.error);
    });
  }

  async function init() {
    me = getSessionUser();
    if (!me?.id || !me?.role) {
      // if not logged in, send to login
      window.location.href = "login.html";
      return;
    }

    els.roleLine.textContent = `Logged in as: ${me.role} #${me.id}`;
    bindUI();
    await refreshInbox(false);
    await handleAutoOpenFromUrl();
  }

  init().catch((e) => {
    console.error(e);
    alert(e?.message || "Chat failed to load");
  });
})();
