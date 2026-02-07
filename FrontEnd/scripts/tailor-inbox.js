// FrontEnd/scripts/tailor-inbox.js
(() => {
  "use strict";

  const API_BASES = [
    (window.API_BASE_URL || "").replace(/\/$/, ""),
    "http://localhost:5000",
    "http://localhost:3000",
  ].filter(Boolean);

  const SESSION_KEY = "tc_current_user_v1";
  const $ = (id) => document.getElementById(id);

  const els = {
    threads: $("tcThreads"),
    empty: $("tcThreadsEmpty"),
    count: $("tcInboxCount"),
    search: $("tcInboxSearch"),
    refresh: $("tcInboxRefresh"),
    chatFrame: $("tcChatFrame"),

    tabInquiry: $("tcTabInquiry"),
    tabOrders: $("tcTabOrders"),
    tabMeta: $("tcTabMeta"),
  };

  // -----------------------------
  // Styles (IG ring + chat bubbles)
  // -----------------------------
  function injectStyles() {
    const id = "tcTailorInboxStyles";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .tc-ig-ring{
        width: 46px; height: 46px;
        border-radius: 999px;
        padding: 2px;
        background: conic-gradient(from 180deg, #f59e0b, #ef4444, #8b5cf6, #f59e0b);
        box-shadow: 0 8px 18px rgba(15,23,42,.08);
      }
      .tc-ig-ring.is-muted{ background: rgba(15,23,42,.12); }
      .tc-ig-ring .tc-avatar{
        width: 100% !important;
        height: 100% !important;
        border-radius: 999px !important;
        border: 2px solid #fff !important;
        background: rgba(15,23,42,.06);
        overflow: hidden;
        display: grid;
        place-items: center;
        font-weight: 800;
      }
      .tc-ig-ring .tc-avatar img{
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }

      .tc-ig-ring-sm{
        width: 36px; height: 36px;
        border-radius: 999px;
        padding: 2px;
        background: conic-gradient(from 180deg, #f59e0b, #ef4444, #8b5cf6, #f59e0b);
      }
      .tc-ig-ring-sm.is-muted{ background: rgba(15,23,42,.12); }
      .tc-ig-ring-sm .tc-avatar{
        width: 100% !important;
        height: 100% !important;
        border-radius: 999px !important;
        border: 2px solid #fff !important;
        background: rgba(15,23,42,.06);
        overflow: hidden;
        display: grid;
        place-items: center;
        font-weight: 800;
      }
      .tc-ig-ring-sm .tc-avatar img{
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }

      .tc-chat-wrap{ display:flex; flex-direction:column; height: calc(74vh - 76px); }
      .tc-msgs{ flex:1; overflow:auto; padding: 14px; background: rgba(15,23,42,.02); }
      .tc-msg-row{ display:flex; margin: 8px 0; }
      .tc-msg-row.me{ justify-content:flex-end; }
      .tc-msg-row.them{ justify-content:flex-start; }
      .tc-bubble{
        max-width: min(560px, 78%);
        border-radius: 18px;
        padding: 10px 12px;
        border: 1px solid rgba(15,23,42,.10);
        box-shadow: 0 6px 16px rgba(15,23,42,.05);
        background:#fff;
        word-wrap: break-word;
      }
      .tc-msg-row.me .tc-bubble{
        background: rgba(217,119,6,.14);
        border-color: rgba(217,119,6,.22);
      }
      .tc-bubble .tc-time{
        font-size: 11px;
        color: rgba(15,23,42,.55);
        margin-top: 6px;
        text-align:right;
      }
      .tc-attach{
        display:flex;
        align-items:center;
        gap:10px;
        padding: 10px;
        border-top: 1px solid rgba(15,23,42,.10);
        background:#fff;
      }
      .tc-attach button{ border-radius: 10px; }
      .tc-file-pill{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding: 8px 10px;
        border-radius: 12px;
        border: 1px solid rgba(15,23,42,.12);
        background:#fff;
      }
      .tc-img-prev{
        margin-top: 8px;
        border-radius: 14px;
        overflow:hidden;
        border: 1px solid rgba(15,23,42,.10);
      }
      .tc-img-prev img{ display:block; width:100%; height:auto; }
      .tc-locked-banner{
        margin: 10px 14px 0;
        border: 1px solid rgba(239,68,68,.25);
        background: rgba(239,68,68,.08);
        color: rgba(127,29,29,.95);
        border-radius: 14px;
        padding: 10px 12px;
        font-size: 13px;
      }
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  function pickId(obj) {
    if (!obj || typeof obj !== "object") return null;
    return obj.id ?? obj._id ?? obj.userId ?? obj.uid ?? obj.user_id ?? null;
  }

  function getSessionUser() {
    const s = safeParse(localStorage.getItem(SESSION_KEY) || "null");
    if (!s) return null;
    const u = s?.user && typeof s.user === "object" ? s.user : s;
    return {
      id: pickId(u) ?? pickId(s) ?? null, // this is tailor USER id (not profile id)
      role: String(u.role ?? s.role ?? s.activeRole ?? "").toLowerCase(),
      name: u.name ?? s.name ?? "Tailor",
      avatarUrl: u.profileImageUrl ?? u.avatarUrl ?? u.photoUrl ?? "",
    };
  }

  function fmtTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    return sameDay
      ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-IN", { month: "short", day: "2-digit" });
  }

  function firstLetter(name) {
    return (String(name || "C").trim().charAt(0) || "C").toUpperCase();
  }

  function guessFileNameFromUrl(url) {
    try {
      const u = String(url || "");
      const last = u.split("/").pop() || "Attachment";
      return decodeURIComponent(last.split("?")[0]) || "Attachment";
    } catch {
      return "Attachment";
    }
  }

  function isImageFile(msg) {
    const mime = String(msg?.mime || "").toLowerCase();
    const url = String(msg?.fileUrl || "");
    if (mime.startsWith("image/")) return true;
    return /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
  }

  function detectCategory(t) {
    const orderId = t?.context?.orderId ?? t?.orderId ?? null;
    return orderId ? "ORDER" : "INQUIRY";
  }

  // locked is resolved on chat-open (fast)
  function normalizeThread(raw) {
    const peer = raw?.peer || {};
    const ctx = raw?.context || {};
    return {
      raw,
      id: raw?.id ?? raw?._id ?? null,
      type: detectCategory(raw),
      peer: {
        id: peer?.id ?? ctx?.customerId ?? null,
        name: peer?.name || "Customer",
        avatarUrl: peer?.avatarUrl || "",
      },
      lastText: String(raw?.lastMessage?.text || "").trim(),
      lastAt: raw?.lastMessage?.createdAt || null,
      unread: Number(raw?.unreadCount || 0) || 0,
      context: {
        tailorId: ctx?.tailorId ?? null,
        customerId: ctx?.customerId ?? peer?.id ?? null,
        orderId: ctx?.orderId ?? null,
        locked: Boolean(ctx?.locked) || Boolean(ctx?.reviewId),
        reviewId: ctx?.reviewId ?? null,
      },
    };
  }

  function normalizeMsg(m, meTailorProfileId) {
    const senderId = m?.senderId ?? null;
    const fileUrl = m?.attachmentUrl ?? "";
    return {
      id: m?._id ?? m?.id ?? null,
      senderId,
      mine: String(senderId) === String(meTailorProfileId),
      text: String(m?.text || "").trim(),
      createdAt: m?.createdAt ?? null,
      fileUrl,
      mime: m?.attachmentType ?? "",
      fileName: fileUrl ? guessFileNameFromUrl(fileUrl) : "",
      isFile: Boolean(fileUrl),
    };
  }

  function threadSubtitle(t) {
    if (t.type === "ORDER") {
      const oid = t.context?.orderId != null
        ? `Order #${String(t.context.orderId).padStart(4, "0")}`
        : "Order";
      return oid;
    }
    return "Inquiry";
  }

  function avatarInner(peer) {
    return peer?.avatarUrl
      ? `<img src="${esc(peer.avatarUrl)}" alt="avatar" />`
      : `<span>${esc(firstLetter(peer?.name || "Customer"))}</span>`;
  }

  // -----------------------------
  // API (tries bases, fast fallback)
  // -----------------------------
  async function fetchJsonAny(path, options = {}) {
    let lastErr = null;
    for (const base of API_BASES) {
      try {
        const res = await fetch(base + path, options);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("All API endpoints failed");
  }

  async function fetchTailorByUserId(userId) {
    return fetchJsonAny(`/api/tailors/by-user/${encodeURIComponent(userId)}`, { method: "GET" });
  }

  async function apiInbox(meTailorProfileId) {
    const qs = `userId=${encodeURIComponent(meTailorProfileId)}&role=tailor`;
    return fetchJsonAny(`/api/chat/inbox?${qs}`, { method: "GET" });
  }

  async function apiEnsureConversation({ meTailorProfileId, thread, viewer }) {
    const payload = {
      customerId: thread.context?.customerId ?? thread.peer?.id ?? null,
      tailorId: meTailorProfileId,
      orderId: thread.context?.orderId ?? null,

      // ✅ tell backend who is opening (so peer returned is correct)
      viewerRole: "tailor",

      // ✅ if we already have customer snapshots from inbox, re-send them (helps backfill)
      customerName: String(thread.peer?.name || "").trim(),
      customerAvatarUrl: String(thread.peer?.avatarUrl || "").trim(),
    };

    const data = await fetchJsonAny(`/api/chat/conversations/ensure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const convId = data?.conversation?.id || data?.conversation?._id || data?.conversationId || null;
    if (!convId) throw new Error("ensureConversation did not return conversation id");
    return { conversationId: String(convId), peer: data?.peer || null };
  }

  async function apiGetMessages(conversationId) {
    return fetchJsonAny(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`, { method: "GET" });
  }

  async function apiSendMessage({ conversationId, meTailorProfileId, text, file }) {
    const fd = new FormData();
    fd.append("senderId", String(meTailorProfileId));
    fd.append("senderRole", "tailor");
    if (text) fd.append("text", text);
    if (file) fd.append("file", file);

    return fetchJsonAny(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      body: fd,
    });
  }

  async function apiMarkRead(conversationId, meTailorProfileId) {
    return fetchJsonAny(`/api/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: String(meTailorProfileId), role: "tailor" }),
    });
  }

  // ✅ Optional: check order review/lock ONLY on open (keeps inbox fast)
  async function apiCheckOrderLock(orderId) {
    if (!orderId) return { locked: false, reviewId: null };

    // Try common endpoints (we only use it on open, so ok)
    const paths = [
      `/api/orders/${encodeURIComponent(orderId)}`,
      `/api/order/${encodeURIComponent(orderId)}`,
      `/api/orders/get/${encodeURIComponent(orderId)}`,
    ];

    for (const p of paths) {
      try {
        const data = await fetchJsonAny(p, { method: "GET" });

        // normalize fields (you can adjust once you confirm your order schema)
        const reviewId = data?.reviewId ?? data?.review?.id ?? data?.review?._id ?? null;
        const reviewed = Boolean(data?.reviewSubmitted || data?.isReviewed || data?.reviewed || reviewId);

        return { locked: reviewed, reviewId };
      } catch {}
    }
    return { locked: false, reviewId: null };
  }

  // -----------------------------
  // State
  // -----------------------------
  let ME_USER = null;        // tailor AUTH user (userId)
  let ME_TAILOR = null;      // tailor PROFILE { id, ... }

  let THREADS = [];
  let ACTIVE_ID = null;
  let ACTIVE_TAB = "ORDER";

  let CHAT_POLL = null;
  let CHAT_MSGS = [];
  let CHAT_LOADING = false;

  // -----------------------------
  // UI: right side
  // -----------------------------
  function showRightEmpty() {
    if (!els.chatFrame) return;
    els.chatFrame.innerHTML = `
      <div class="tc-right-empty">
        <div>
          <div class="tc-ico">💬</div>
          <div class="fw-semibold">Select a chat</div>
          <div class="small mt-1">Choose an inquiry or order chat from the left.</div>
          <div class="small mt-2 text-muted">Tip: Order chats close after customer review is submitted.</div>
        </div>
      </div>
    `;
  }

  function setComposerDisabled(disabled, reasonText = "") {
    const input = document.getElementById("tcMsgText");
    const send = document.getElementById("tcSendBtn");
    const attach = document.getElementById("tcAttachBtn");
    const file = document.getElementById("tcFileInput");
    const hint = document.getElementById("tcComposerHint");

    if (input) input.disabled = !!disabled;
    if (send) send.disabled = !!disabled;
    if (attach) attach.disabled = !!disabled;
    if (file) file.disabled = !!disabled;

    if (hint) {
      hint.textContent = reasonText || "";
      hint.classList.toggle("d-none", !reasonText);
    }
  }

  function renderChatShell(thread) {
    const ringMuted = thread.context?.locked ? "is-muted" : "";
    const pill =
      thread.type === "ORDER"
        ? `<span class="tc-pill tc-order">${esc(threadSubtitle(thread))}</span>`
        : `<span class="tc-pill">Inquiry</span>`;

    const lockPill = thread.context?.locked
      ? `<span class="tc-pill tc-locked">Chat closed</span>`
      : "";

    els.chatFrame.innerHTML = `
      <div class="tc-pane-head p-3">
        <div class="d-flex align-items-center gap-2">
          <div class="tc-ig-ring-sm ${ringMuted}">
            <div class="tc-avatar">${avatarInner(thread.peer)}</div>
          </div>

          <div style="min-width:0;">
            <div class="fw-semibold" style="line-height:1.1;">${esc(thread.peer?.name || "Customer")}</div>
            <div class="d-flex flex-wrap gap-2 mt-1">${pill}${lockPill}</div>
          </div>

          <div class="ms-auto small text-muted" id="tcChatHeadTime">${esc(fmtTime(thread.lastAt))}</div>
        </div>
      </div>

      ${thread.context?.locked ? `<div class="tc-locked-banner">🔒 This order chat is closed because the customer submitted a review.</div>` : ""}

      <div class="tc-chat-wrap">
        <div id="tcMsgs" class="tc-msgs"></div>

        <div class="tc-attach">
          <input id="tcFileInput" type="file" class="d-none" />
          <button id="tcAttachBtn" class="btn btn-outline-secondary btn-sm" type="button" title="Attach file">📎</button>
          <input id="tcMsgText" class="form-control" placeholder="Message..." />
          <button id="tcSendBtn" class="btn btn-primary btn-sm" type="button">Send</button>
        </div>
        <div id="tcComposerHint" class="small text-danger px-3 pb-2 d-none"></div>
      </div>
    `;
  }

  function renderMessages() {
    const wrap = document.getElementById("tcMsgs");
    if (!wrap) return;

    wrap.innerHTML = CHAT_MSGS
      .map((m) => {
        const rowClass = m.mine ? "me" : "them";
        const time = fmtTime(m.createdAt);

        const fileBlock =
          m.isFile && m.fileUrl
            ? `
              <div class="tc-file-pill">
                <span>📎</span>
                <a href="${esc(m.fileUrl)}" target="_blank" rel="noopener">${esc(m.fileName || "Attachment")}</a>
              </div>
              ${isImageFile(m) ? `<div class="tc-img-prev"><img src="${esc(m.fileUrl)}" alt="attachment"/></div>` : ""}
            `
            : "";

        const textBlock = m.text ? `<div>${esc(m.text)}</div>` : "";

        return `
          <div class="tc-msg-row ${rowClass}">
            <div class="tc-bubble">
              ${textBlock}
              ${fileBlock}
              <div class="tc-time">${esc(time)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    wrap.scrollTop = wrap.scrollHeight;
  }

  function stopChatPolling() {
    if (CHAT_POLL) clearInterval(CHAT_POLL);
    CHAT_POLL = null;
  }

  function startChatPolling(thread) {
    stopChatPolling();
    CHAT_POLL = setInterval(async () => {
      try {
        await loadChatMessages(thread, { silent: true });
      } catch {}
    }, 3500);
  }

  async function loadChatMessages(thread, { silent = false } = {}) {
    if (CHAT_LOADING) return;
    CHAT_LOADING = true;

    try {
      // ensure conversation if missing
      if (!thread.id || String(thread.id).startsWith("local-")) {
        const ensured = await apiEnsureConversation({
          meTailorProfileId: ME_TAILOR.id,
          thread,
          viewer: "tailor",
        });

        thread.id = ensured.conversationId;
        ACTIVE_ID = thread.id;

        // update peer (backend may return better info)
        if (ensured.peer?.name) thread.peer.name = ensured.peer.name;
        if (ensured.peer?.avatarUrl) thread.peer.avatarUrl = ensured.peer.avatarUrl;

        // reflect in state list
        const idx = THREADS.findIndex((t) =>
          String(t.raw?.id || t.id) === String(thread.raw?.id || thread.id)
          || (t.context?.orderId && thread.context?.orderId && String(t.context.orderId) === String(thread.context.orderId))
        );
        if (idx >= 0) THREADS[idx].id = thread.id;
        renderThreads();
      }

      const rawMsgs = await apiGetMessages(thread.id);
      const normalized = (Array.isArray(rawMsgs) ? rawMsgs : []).map((m) =>
        normalizeMsg(m, ME_TAILOR.id)
      );

      const prevLast = CHAT_MSGS[CHAT_MSGS.length - 1];
      const nextLast = normalized[normalized.length - 1];
      const changed =
        normalized.length !== CHAT_MSGS.length ||
        String(prevLast?.id || prevLast?.createdAt || "") !== String(nextLast?.id || nextLast?.createdAt || "");

      if (changed) {
        CHAT_MSGS = normalized;
        renderMessages();
      }
    } catch (e) {
      if (!silent) console.warn("[tailor-inbox] loadChatMessages:", e?.message || e);
    } finally {
      CHAT_LOADING = false;
    }
  }

  function bindChatUI(thread) {
    const attachBtn = document.getElementById("tcAttachBtn");
    const fileInput = document.getElementById("tcFileInput");
    const msgText = document.getElementById("tcMsgText");
    const sendBtn = document.getElementById("tcSendBtn");

    if (thread.type === "ORDER" && thread.context?.locked) {
      setComposerDisabled(true, "This order chat is closed after review submission.");
    } else {
      setComposerDisabled(false, "");
    }

    if (attachBtn && fileInput) {
      attachBtn.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", async () => {
        const f = fileInput.files?.[0];
        if (!f) return;

        if (thread.type === "ORDER" && thread.context?.locked) {
          setComposerDisabled(true, "This order chat is closed after review submission.");
          fileInput.value = "";
          return;
        }

        try {
          setComposerDisabled(true, "Uploading...");
          await apiSendMessage({ conversationId: thread.id, meTailorProfileId: ME_TAILOR.id, text: "", file: f });
          fileInput.value = "";
          setComposerDisabled(false, "");
          await loadChatMessages(thread, { silent: true });
        } catch (e) {
          setComposerDisabled(false, `Upload failed: ${e?.message || "Unknown error"}`);
          fileInput.value = "";
        }
      });
    }

    async function sendTextNow() {
      const text = (msgText?.value || "").trim();
      if (!text) return;

      if (thread.type === "ORDER" && thread.context?.locked) {
        setComposerDisabled(true, "This order chat is closed after review submission.");
        return;
      }

      try {
        setComposerDisabled(true, "Sending...");
        await apiSendMessage({ conversationId: thread.id, meTailorProfileId: ME_TAILOR.id, text, file: null });
        msgText.value = "";
        setComposerDisabled(false, "");
        await loadChatMessages(thread, { silent: true });
      } catch (e) {
        setComposerDisabled(false, `Send failed: ${e?.message || "Unknown error"}`);
      }
    }

    if (sendBtn) sendBtn.addEventListener("click", sendTextNow);
    if (msgText) {
      msgText.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault();
          sendTextNow();
        }
      });
    }
  }

  async function openChat(thread) {
    ACTIVE_ID = thread.id;

    // ✅ If ORDER chat: check lock only now (fast)
    if (thread.type === "ORDER" && thread.context?.orderId && !thread.context?.locked) {
      const { locked, reviewId } = await apiCheckOrderLock(thread.context.orderId);
      thread.context.locked = locked;
      thread.context.reviewId = reviewId;
    }

    // mark read
    if (thread.id && !String(thread.id).startsWith("local-")) {
      apiMarkRead(thread.id, ME_TAILOR.id).catch(() => {});
    }

    // set unread to 0 locally
    const idx = THREADS.findIndex((t) => String(t.id) === String(thread.id));
    if (idx >= 0) THREADS[idx].unread = 0;
    renderThreads();

    renderChatShell(thread);
    bindChatUI(thread);

    CHAT_MSGS = [];
    await loadChatMessages(thread);
    startChatPolling(thread);
  }

  // -----------------------------
  // Left list
  // -----------------------------
  function setTab(tab) {
    ACTIVE_TAB = tab;

    els.tabInquiry?.classList.toggle("is-active", tab === "INQUIRY");
    els.tabOrders?.classList.toggle("is-active", tab === "ORDER");
    if (els.tabMeta) els.tabMeta.textContent = tab === "INQUIRY" ? "Pre-order chats" : "Order chats";

    const activeThread = THREADS.find((t) => String(t.id) === String(ACTIVE_ID));
    if (activeThread && activeThread.type !== ACTIVE_TAB) {
      ACTIVE_ID = null;
      stopChatPolling();
      showRightEmpty();
    }
    renderThreads();
  }

  function getFiltered() {
    const q = (els.search?.value || "").trim().toLowerCase();
    let list = THREADS.filter((t) => t.type === ACTIVE_TAB);

    if (q) {
      list = list.filter((t) => {
        const name = String(t.peer?.name || "").toLowerCase();
        const last = String(t.lastText || "").toLowerCase();
        const oid = t.context?.orderId != null ? String(t.context.orderId) : "";
        return name.includes(q) || last.includes(q) || oid.includes(q);
      });
    }
    return list;
  }

  function ensureThreadFromUrlIfNeeded() {
    const u = new URL(window.location.href);
    const orderId = u.searchParams.get("orderId");
    const tab = String(u.searchParams.get("tab") || "").toUpperCase();

    if (tab === "INQUIRY" || tab === "ORDER") ACTIVE_TAB = tab;
    if (!orderId) return;

    if (THREADS.some((t) => String(t.context?.orderId) === String(orderId))) return;

    THREADS = [
      normalizeThread({
        id: `local-ord-${orderId}`,
        peer: { id: null, name: "Customer", avatarUrl: "" },
        lastMessage: { text: "Loading chat…", createdAt: new Date().toISOString() },
        unreadCount: 0,
        context: { tailorId: ME_TAILOR.id, orderId: orderId, locked: false, customerId: null },
      }),
      ...THREADS,
    ];
  }

  function renderThreads() {
    if (!els.threads || !els.empty) return;

    const list = getFiltered();
    if (els.count) els.count.textContent = String(list.length);

    if (!list.length) {
      els.threads.innerHTML = "";
      els.empty.classList.remove("d-none");
      els.empty.textContent = ACTIVE_TAB === "INQUIRY" ? "No inquiry chats yet." : "No order chats yet.";
      return;
    }

    els.empty.classList.add("d-none");

    els.threads.innerHTML = list
      .map((t) => {
        const active = String(t.id) === String(ACTIVE_ID) ? "active" : "";
        const time = fmtTime(t.lastAt);

        const subtitlePill =
          t.type === "ORDER"
            ? `<span class="tc-pill tc-order">${esc(threadSubtitle(t))}</span>`
            : `<span class="tc-pill">Inquiry</span>`;

        const lockedPill = t.context?.locked ? `<span class="tc-pill tc-locked">Closed</span>` : "";

        const last = t.lastText ? esc(t.lastText) : `<span class="text-muted">No messages yet</span>`;
        const displayName = t.peer?.name || "Customer";

        const ringMuted = t.context?.locked ? "is-muted" : "";

        return `
          <div class="tc-thread ${active}" data-id="${esc(t.id)}">
            <div class="tc-avatar-wrap">
              <div class="tc-ig-ring ${ringMuted}">
                <div class="tc-avatar">${avatarInner(t.peer)}</div>
              </div>
              <div class="tc-online-dot" title="online"></div>
            </div>

            <div class="tc-thread-main">
              <div class="tc-thread-top">
                <div class="tc-thread-name">${esc(displayName)}</div>
                <div class="tc-thread-time">${esc(time)}</div>
              </div>

              <div class="d-flex align-items-center justify-content-between gap-2">
                <div class="tc-thread-last">${last}</div>
                ${t.unread > 0 ? `<div class="tc-unread">${t.unread > 99 ? "99+" : t.unread}</div>` : ""}
              </div>

              <div class="tc-badges">
                ${subtitlePill}
                ${lockedPill}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    els.threads.querySelectorAll(".tc-thread").forEach((row) => {
      row.addEventListener("click", async () => {
        const id = row.getAttribute("data-id");
        const thread = THREADS.find((x) => String(x.id) === String(id));
        if (thread) await openChat(thread);
      });
    });
  }

  async function refreshThreads({ keepSelection = true } = {}) {
    const prevActive = ACTIVE_ID;

    const data = await apiInbox(ME_TAILOR.id);
    THREADS = (Array.isArray(data) ? data : []).map(normalizeThread);

    THREADS.sort((a, b) => {
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tb - ta;
    });

    ensureThreadFromUrlIfNeeded();

    if (keepSelection && prevActive) {
      const still = THREADS.find((t) => String(t.id) === String(prevActive));
      ACTIVE_ID = still ? still.id : null;
    }

    setTab(ACTIVE_TAB);
    renderThreads();

    const u = new URL(window.location.href);
    const orderId = u.searchParams.get("orderId");

    if (orderId) {
      setTab("ORDER");
      const found = THREADS.find((t) => String(t.context?.orderId) === String(orderId));
      if (found) await openChat(found);
      return;
    }

    if (!ACTIVE_ID) showRightEmpty();
  }

  function bindUI() {
    els.tabInquiry?.addEventListener("click", () => setTab("INQUIRY"));
    els.tabOrders?.addEventListener("click", () => setTab("ORDER"));
    els.search?.addEventListener("input", () => renderThreads());

    els.refresh?.addEventListener("click", async () => {
      const btn = els.refresh;
      if (!btn) return;

      btn.disabled = true;
      btn.textContent = "Refreshing...";
      try {
        await refreshThreads({ keepSelection: true });
      } finally {
        btn.disabled = false;
        btn.textContent = "↻ Refresh";
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopChatPolling();
    });
  }

  async function init() {
    injectStyles();

    ME_USER = getSessionUser();
    if (!ME_USER || ME_USER.role !== "tailor") {
      window.location.href = "login-tailor.html";
      return;
    }

    // ✅ convert tailor USER -> tailor PROFILE (needed by inbox API)
    ME_TAILOR = await fetchTailorByUserId(ME_USER.id);
    if (!ME_TAILOR?.id) {
      throw new Error("Tailor profile not found for this account.");
    }

    const u = new URL(window.location.href);
    const tab = String(u.searchParams.get("tab") || "").toUpperCase();
    ACTIVE_TAB = tab === "INQUIRY" ? "INQUIRY" : "ORDER";

    bindUI();
    await refreshThreads({ keepSelection: false });
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => {
      console.error(e);
      if (els.empty) {
        els.empty.classList.remove("d-none");
        els.empty.textContent = `Failed to load inbox: ${e?.message || e}`;
      }
      showRightEmpty();
    });
  });
})();
