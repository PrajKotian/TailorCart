// FrontEnd/scripts/inbox.js
(() => {
  "use strict";

  const API_BASES = [
    (window.API_BASE_URL || "").replace(/\/$/, ""),
    "http://localhost:5000",
    "http://localhost:3000",
  ].filter(Boolean);

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
    const id = "tcInboxNoIframeStyles";
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
      }

      .tc-chat-wrap{
        display:flex;
        flex-direction:column;
        height: calc(74vh - 76px);
      }

      .tc-msgs{
        flex:1;
        overflow:auto;
        padding: 14px;
        background: rgba(15,23,42,.02);
      }

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

  function normalizeRole(r) {
    return String(r || "").toLowerCase();
  }

  function pickId(obj) {
    if (!obj || typeof obj !== "object") return null;
    return obj.id ?? obj._id ?? obj.userId ?? obj.customerId ?? obj.tailorId ?? obj.uid ?? obj.user_id ?? null;
  }

  function getMe() {
    const u = window.AuthStore?.getCurrentUser?.();
    if (u) {
      const id = pickId(u) || pickId(u.user) || pickId(u.profile);
      if (id != null) return { id, role: normalizeRole(u.activeRole || u.role || "customer"), name: u.name || u.username || "User" };
    }

    const keys = ["tc_current_user_v1", "tc_user", "user", "auth_user"];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const s = JSON.parse(raw);
        const uu = s?.user && typeof s.user === "object" ? s.user : s;
        const id = pickId(uu) || pickId(s);
        if (id != null) return { id, role: normalizeRole(uu?.activeRole || uu?.role || s?.role || "customer"), name: uu?.name || uu?.username || s?.name || "User" };
      } catch {}
    }
    return null;
  }

  function fmtTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    return sameDay
      ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-IN", { month: "short", day: "2-digit" });
  }

  function firstLetter(name) {
    return (String(name || "T").trim().charAt(0) || "T").toUpperCase();
  }

  function detectCategory(t) {
    const type = String(t?.type || t?.context?.type || t?.chatType || "").toUpperCase();
    if (type === "ORDER") return "ORDER";
    if (type === "INQUIRY") return "INQUIRY";
    const orderId = t?.orderId ?? t?.context?.orderId ?? t?.order_id ?? null;
    return orderId ? "ORDER" : "INQUIRY";
  }

  function isLocked(t) {
    const locked =
      Boolean(t?.locked) ||
      Boolean(t?.isLocked) ||
      Boolean(t?.closed) ||
      Boolean(t?.isClosed) ||
      Boolean(t?.context?.locked) ||
      Boolean(t?.context?.isLocked);

    const reviewed =
      Boolean(t?.orderReviewed) ||
      Boolean(t?.context?.orderReviewed) ||
      Boolean(t?.reviewId) ||
      Boolean(t?.context?.reviewId);

    return locked || reviewed;
  }

  function normalizeThread(raw) {
    const peer = raw?.peer || {};
    const lastMsg = raw?.lastMessage || {};
    const context = raw?.context || raw?.meta || {};

    const orderId = raw?.orderId ?? context?.orderId ?? null;
    const tailorId =
      raw?.tailorId ??
      context?.tailorId ??
      peer?.id ??
      raw?.peerId ??
      null;

    const cat = detectCategory(raw);

    const lastText = String(lastMsg?.text ?? raw?.lastText ?? "").trim();
    const lastAt = lastMsg?.createdAt ?? raw?.lastAt ?? raw?.updatedAt ?? null;

    return {
      raw,
      id: raw?.id ?? raw?._id ?? raw?.conversationId ?? null,
      type: cat,
      peer: {
        id: peer?.id ?? tailorId,
        name: peer?.name ?? raw?.tailorName ?? "",
        avatarUrl: peer?.avatarUrl ?? raw?.tailorAvatarUrl ?? "",
      },
      lastText,
      lastAt,
      unread: Number(raw?.unreadCount ?? raw?.unread ?? 0) || 0,
      meta: {
        lastIsFile: lastText.startsWith("📎") || lastText === "📎 Attachment",
        lastFileName: "",
      },
      context: {
        tailorId,
        orderId,
        garment: raw?.garment ?? context?.garment ?? "",
        locked: isLocked(raw),
        reviewId: raw?.reviewId ?? context?.reviewId ?? null,
      },
    };
  }

  function normalizeMsg(m, meId) {
    const senderId = m?.senderId ?? m?.from ?? m?.userId ?? m?.sender ?? null;
    const createdAt = m?.createdAt ?? m?.time ?? m?.timestamp ?? null;

    const text = String(m?.text ?? m?.message ?? m?.body ?? "").trim();

    // backend uses attachmentUrl/attachmentType
    const fileUrl = m?.attachmentUrl || m?.fileUrl || m?.url || "";
    const mime = m?.attachmentType || m?.mimeType || m?.mime || "";
    const fileName = m?.fileName || m?.originalName || m?.name || "";

    const isFile = Boolean(fileUrl);

    return {
      id: m?.id ?? m?._id ?? null,
      senderId,
      mine: String(senderId) === String(meId),
      text,
      createdAt,
      fileUrl,
      fileName,
      mime,
      isFile,
    };
  }

  function isImageFile(msg) {
    const mime = String(msg?.mime || "").toLowerCase();
    const url = String(msg?.fileUrl || "");
    if (mime.startsWith("image/")) return true;
    return /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
  }

  // -----------------------------
  // API helpers
  // -----------------------------
  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error || data?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function apiTryMany({ paths, method = "GET", jsonBody = null, formData = null }) {
    // prefer AuthStore if available
    const fn = window.AuthStore?.authFetch || window.AuthStore?.apiFetch;
    if (fn) {
      for (const path of paths) {
        try {
          const opts = { method, headers: {} };
          if (formData) opts.body = formData;
          else if (jsonBody) {
            opts.headers["Content-Type"] = "application/json";
            opts.body = JSON.stringify(jsonBody);
          }
          const data = await fn(path, opts);
          return { data, base: "" };
        } catch {}
      }
    }

    for (const base of API_BASES) {
      for (const path of paths) {
        try {
          const url = base + path;
          const opts = { method, headers: {} };
          if (formData) opts.body = formData;
          else if (jsonBody) {
            opts.headers["Content-Type"] = "application/json";
            opts.body = JSON.stringify(jsonBody);
          }
          const data = await fetchJson(url, opts);
          return { data, base };
        } catch {}
      }
    }

    throw new Error("All endpoints failed");
  }

  // -----------------------------
  // Inbox + conversation APIs (Optimized for new backend A)
  // -----------------------------
  async function apiInbox(me) {
    const role = me.role || "customer";
    const qs = `userId=${encodeURIComponent(me.id)}&role=${encodeURIComponent(role)}`;

    const paths = [
      `/api/chat/inbox?${qs}`,
    ];

    const { data } = await apiTryMany({ paths, method: "GET" });
    return Array.isArray(data) ? data : [];
  }

  // ensure/create conversation (returns conversation + peer)
  async function apiEnsureConversation({ customerId, tailorId, orderId }) {
    const payload = { customerId, tailorId, orderId: orderId || null };
    const paths = [`/api/chat/conversations/ensure`];
    const { data } = await apiTryMany({ paths, method: "POST", jsonBody: payload });

    const conv = data?.conversation || data;
    const cid = conv?.id || conv?._id || data?.conversationId || data?.id;
    if (!cid) throw new Error("ensure did not return conversation id");

    return {
      id: String(cid),
      peer: data?.peer || conv?.peer || null,
      conversation: conv,
    };
  }

  // fetch messages delta using ?after=
  async function apiGetMessagesDelta({ conversationId, after }) {
    const qs = new URLSearchParams();
    if (after) qs.set("after", after);

    const paths = [
      `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?${qs.toString()}`,
    ];

    const { data } = await apiTryMany({ paths, method: "GET" });
    return Array.isArray(data) ? data : [];
  }

  async function apiSendText({ conversationId, senderId, senderRole, text }) {
    const fd = new FormData();
    fd.append("senderId", String(senderId));
    fd.append("senderRole", String(senderRole));
    fd.append("text", text);

    const paths = [
      `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    ];

    const { data } = await apiTryMany({ paths, method: "POST", formData: fd });
    return data;
  }

  async function apiSendFile({ conversationId, senderId, senderRole, file, text = "" }) {
    const fd = new FormData();
    fd.append("senderId", String(senderId));
    fd.append("senderRole", String(senderRole));
    if (text) fd.append("text", text);
    fd.append("file", file);

    const paths = [
      `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    ];

    const { data } = await apiTryMany({ paths, method: "POST", formData: fd });
    return data;
  }

  async function apiMarkRead({ conversationId, userId, role }) {
    const payload = { userId, role };
    const paths = [
      `/api/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    ];
    await apiTryMany({ paths, method: "POST", jsonBody: payload });
  }

  // -----------------------------
  // State
  // -----------------------------
  let THREADS = [];
  let ACTIVE_ID = null;
  let ACTIVE_TAB = "INQUIRY";

  let CHAT_POLL = null;
  let CHAT_MSGS = [];
  let CHAT_LOADING = false;

  // For delta polling
  let LAST_SEEN_AT = null; // ISO string of last message createdAt we rendered

  // -----------------------------
  // Right panel (chat)
  // -----------------------------
  function showRightEmpty() {
    if (!els.chatFrame) return;
    els.chatFrame.innerHTML = `
      <div class="tc-right-empty">
        <div>
          <div class="tc-ico">💬</div>
          <div class="fw-semibold">Select a chat</div>
          <div class="small mt-1">Choose an inquiry or order chat from the left.</div>
          <div class="small mt-2 text-muted">Tip: Order chats can be active until review is submitted.</div>
        </div>
      </div>
    `;
  }

  function threadSubtitle(t) {
    if (t.type === "ORDER") {
      const oid = t.context?.orderId != null ? `Order #${String(t.context.orderId).padStart(4, "0")}` : "Order";
      const gar = t.context?.garment ? ` • ${t.context.garment}` : "";
      return `${oid}${gar}`;
    }
    return "Inquiry";
  }

  function avatarInner(peer) {
    return peer?.avatarUrl
      ? `<img src="${esc(peer.avatarUrl)}" alt="avatar" />`
      : `<span>${esc(firstLetter(peer?.name || "T"))}</span>`;
  }

  function renderMessages(me) {
    const wrap = document.getElementById("tcMsgs");
    if (!wrap) return;

    // render full list when opening; later we append deltas
    wrap.innerHTML = CHAT_MSGS
      .map((m) => {
        const rowClass = m.mine ? "me" : "them";
        const time = fmtTime(m.createdAt);

        const fileBlock = m.isFile && m.fileUrl
          ? `
            <div class="tc-file-pill">
              <span>📎</span>
              <a href="${esc(m.fileUrl)}" target="_blank" rel="noopener">
                ${esc(m.fileName || "Attachment")}
              </a>
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

  function appendMessages(me, msgs) {
    const wrap = document.getElementById("tcMsgs");
    if (!wrap || !msgs.length) return;

    const atBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 80;

    const html = msgs.map((m) => {
      const rowClass = m.mine ? "me" : "them";
      const time = fmtTime(m.createdAt);

      const fileBlock = m.isFile && m.fileUrl
        ? `
          <div class="tc-file-pill">
            <span>📎</span>
            <a href="${esc(m.fileUrl)}" target="_blank" rel="noopener">
              ${esc(m.fileName || "Attachment")}
            </a>
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
    }).join("");

    wrap.insertAdjacentHTML("beforeend", html);
    if (atBottom) wrap.scrollTop = wrap.scrollHeight;
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

    const lockPill = thread.context?.locked ? `<span class="tc-pill tc-locked">Chat closed</span>` : "";

    els.chatFrame.innerHTML = `
      <div class="tc-pane-head p-3">
        <div class="d-flex align-items-center gap-2">
          <div class="tc-ig-ring-sm ${ringMuted}">
            <div class="tc-avatar">${avatarInner(thread.peer)}</div>
          </div>

          <div style="min-width:0;">
            <div class="fw-semibold" style="line-height:1.1;">${esc(thread.peer?.name || "Tailor")}</div>
            <div class="d-flex flex-wrap gap-2 mt-1">
              ${pill}
              ${lockPill}
            </div>
          </div>

          <div class="ms-auto small text-muted" id="tcChatHeadTime">${esc(fmtTime(thread.lastAt))}</div>
        </div>
      </div>

      ${thread.context?.locked ? `<div class="tc-locked-banner">🔒 This order chat is closed because a review has been submitted.</div>` : ""}

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

  function stopChatPolling() {
    if (CHAT_POLL) clearInterval(CHAT_POLL);
    CHAT_POLL = null;
  }

  function startChatPolling(thread) {
    stopChatPolling();
    CHAT_POLL = setInterval(async () => {
      try {
        await pollNewMessages(thread);
      } catch {}
    }, 2500); // slightly faster but lighter (delta only)
  }

  async function pollNewMessages(thread) {
    if (!thread?.id || String(thread.id).startsWith("local-")) return;
    const me = getMe();
    if (!me) return;

    const after = LAST_SEEN_AT;
    const raw = await apiGetMessagesDelta({ conversationId: thread.id, after });
    if (!raw.length) return;

    const normalized = raw.map((m) => normalizeMsg(m, me.id));
    CHAT_MSGS = CHAT_MSGS.concat(normalized);

    // update last seen
    const last = normalized[normalized.length - 1];
    if (last?.createdAt) LAST_SEEN_AT = new Date(last.createdAt).toISOString();

    appendMessages(me, normalized);

    // update thread preview without re-rendering whole list
    updateThreadPreview(thread.id, last);
  }

  function updateThreadPreview(conversationId, lastMsg) {
    const idx = THREADS.findIndex((t) => String(t.id) === String(conversationId));
    if (idx < 0) return;

    const lastText = lastMsg?.isFile
      ? `📎 ${lastMsg.fileName || "Attachment"}`
      : (lastMsg?.text || "");

    const lastAt = lastMsg?.createdAt || new Date().toISOString();

    THREADS[idx].lastText = lastText;
    THREADS[idx].lastAt = lastAt;
    THREADS[idx].unread = 0;

    const headTime = document.getElementById("tcChatHeadTime");
    if (headTime) headTime.textContent = fmtTime(lastAt);

    // patch DOM row only
    const row = els.threads?.querySelector(`.tc-thread[data-id="${CSS.escape(String(conversationId))}"]`);
    if (!row) return;

    const timeEl = row.querySelector(".tc-thread-time");
    const lastEl = row.querySelector(".tc-thread-last");
    const unreadEl = row.querySelector(".tc-unread");

    if (timeEl) timeEl.textContent = fmtTime(lastAt);
    if (lastEl) lastEl.textContent = lastText || "No messages yet";
    if (unreadEl) unreadEl.remove();
  }

  async function openChat(thread) {
    ACTIVE_ID = thread.id;

    // mark read (server) to reset unread counter
    const me = getMe();
    if (me && thread?.id && !String(thread.id).startsWith("local-")) {
      apiMarkRead({ conversationId: thread.id, userId: me.id, role: me.role }).catch(() => {});
    }

    // locally reset unread and rerender threads ONCE
    const idx = THREADS.findIndex((t) => String(t.id) === String(thread.id));
    if (idx >= 0) THREADS[idx].unread = 0;
    renderThreads();

    renderChatShell(thread);
    bindChatUI(thread);

    CHAT_MSGS = [];
    LAST_SEEN_AT = null;

    // first load: fetch all (after empty -> returns all because backend ignores invalid after)
    await loadInitialMessages(thread);
    startChatPolling(thread);
  }

  async function loadInitialMessages(thread) {
    const me = getMe();
    if (!me) return;

    if (!thread.id || String(thread.id).startsWith("local-")) {
      // create conversation first
      const ensure = await apiEnsureConversation({
        customerId: me.role === "customer" ? me.id : thread.context?.customerId,
        tailorId: thread.context?.tailorId ?? thread.peer?.id,
        orderId: thread.context?.orderId || null,
      });

      // update thread id
      const prevId = thread.id;
      thread.id = ensure.id;
      ACTIVE_ID = ensure.id;

      // if backend returned peer snapshot, use it
      if (ensure.peer) thread.peer = ensure.peer;

      // patch THREADS
      const i = THREADS.findIndex((t) => String(t.id) === String(prevId));
      if (i >= 0) THREADS[i].id = ensure.id;

      renderThreads();
    }

    const raw = await apiGetMessagesDelta({ conversationId: thread.id, after: null });
    const normalized = raw.map((m) => normalizeMsg(m, me.id));
    CHAT_MSGS = normalized;

    const last = normalized[normalized.length - 1];
    if (last?.createdAt) LAST_SEEN_AT = new Date(last.createdAt).toISOString();

    renderMessages(me);

    // update preview once
    if (last) updateThreadPreview(thread.id, last);
  }

  function bindChatUI(thread) {
    const me = getMe();
    if (!me) return;

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
          await apiSendFile({
            conversationId: thread.id,
            senderId: me.id,
            senderRole: me.role,
            file: f,
          });
          fileInput.value = "";
          setComposerDisabled(false, "");
          // delta poll immediately
          await pollNewMessages(thread);
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
        await apiSendText({
          conversationId: thread.id,
          senderId: me.id,
          senderRole: me.role,
          text,
        });
        if (msgText) msgText.value = "";
        setComposerDisabled(false, "");
        await pollNewMessages(thread);
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

  // -----------------------------
  // Left list (threads)
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
        const gar = String(t.context?.garment || "").toLowerCase();
        return name.includes(q) || last.includes(q) || oid.includes(q) || gar.includes(q);
      });
    }

    return list;
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

        const last = t.lastText ? esc(t.lastText) : "No messages yet";

        const ringMuted = t.context?.locked ? "is-muted" : "";
        const displayName = t.peer?.name || (t.context?.tailorId ? `Tailor #${t.context.tailorId}` : "Tailor");

        return `
          <div class="tc-thread ${active}" data-id="${esc(t.id)}">
            <div class="tc-avatar-wrap">
              <div class="tc-ig-ring ${ringMuted}">
                <div class="tc-avatar">
                  ${t.peer?.avatarUrl
                    ? `<img src="${esc(t.peer.avatarUrl)}" alt="avatar" />`
                    : `<span>${esc(firstLetter(displayName))}</span>`
                  }
                </div>
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
  }

  // Event delegation (fast): one handler, no rebind on every render
  function bindThreadClicks() {
    if (!els.threads) return;
    els.threads.addEventListener("click", async (e) => {
      const row = e.target.closest(".tc-thread");
      if (!row) return;
      const id = row.getAttribute("data-id");
      const thread = THREADS.find((x) => String(x.id) === String(id));
      if (thread) await openChat(thread);
    });
  }

  // -----------------------------
  // Init / refresh
  // -----------------------------
  async function loadThreads() {
    const me = getMe();
    if (!me) {
      window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
      return [];
    }

    const list = await apiInbox(me);
    const normalized = list.map(normalizeThread);

    // newest first (already sorted server-side; still safe)
    normalized.sort((a, b) => {
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tb - ta;
    });

    return normalized;
  }

  function ensureThreadFromUrlIfNeeded() {
    const u = new URL(window.location.href);
    const tailorId = u.searchParams.get("tailorId");
    const orderId = u.searchParams.get("orderId");

    if (!tailorId && !orderId) return;

    // if exists already, skip
    if (orderId && THREADS.some((t) => String(t.context?.orderId) === String(orderId))) return;
    if (tailorId && THREADS.some((t) => String(t.context?.tailorId || t.peer?.id) === String(tailorId))) return;

    const synthetic = normalizeThread({
      id: `local-${orderId ? "ord" : "inq"}-${orderId || tailorId}`,
      type: orderId ? "ORDER" : "INQUIRY",
      peer: { id: tailorId || "Tailor", name: "", avatarUrl: "" },
      lastMessage: { text: "Start chatting…", createdAt: new Date().toISOString() },
      unreadCount: 0,
      context: { tailorId: tailorId || null, orderId: orderId || null, locked: false },
    });

    THREADS = [synthetic, ...THREADS];
  }

  function pickFromUrl() {
    const u = new URL(window.location.href);
    const tab = String(u.searchParams.get("tab") || "").toUpperCase();
    const tailorId = u.searchParams.get("tailorId");
    const orderId = u.searchParams.get("orderId");

    if (tab === "ORDER" || tab === "INQUIRY") setTab(tab);

    if (orderId) {
      setTab("ORDER");
      const found = THREADS.find((t) => String(t.context?.orderId) === String(orderId));
      if (found) return openChat(found);
    }

    if (tailorId) {
      const found =
        THREADS.find((t) => t.type === "INQUIRY" && String(t.context?.tailorId || t.peer?.id) === String(tailorId)) ||
        THREADS.find((t) => String(t.context?.tailorId || t.peer?.id) === String(tailorId));

      if (found) {
        setTab(found.type);
        return openChat(found);
      }
    }
  }

  async function refreshThreads({ keepSelection = true } = {}) {
    const prevActive = ACTIVE_ID;

    THREADS = await loadThreads();
    ensureThreadFromUrlIfNeeded();

    if (keepSelection && prevActive) {
      const still = THREADS.find((t) => String(t.id) === String(prevActive));
      ACTIVE_ID = still ? still.id : null;
    }

    renderThreads();

    if (ACTIVE_ID) {
      const active = THREADS.find((t) => String(t.id) === String(ACTIVE_ID));
      if (active) await openChat(active);
    } else {
      pickFromUrl();
      if (!ACTIVE_ID) showRightEmpty();
    }
  }

  function bindUI() {
    els.tabInquiry?.addEventListener("click", () => setTab("INQUIRY"));
    els.tabOrders?.addEventListener("click", () => setTab("ORDER"));
    els.search?.addEventListener("input", () => renderThreads());

    els.refresh?.addEventListener("click", async () => {
      const btn = els.refresh;
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Refreshing...";
      }
      try {
        await refreshThreads({ keepSelection: true });
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "↻ Refresh";
        }
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopChatPolling();
      }
    });
  }

  async function init() {
    injectStyles();
    bindThreadClicks();

    const u = new URL(window.location.href);
    const tab = String(u.searchParams.get("tab") || "").toUpperCase();
    ACTIVE_TAB = tab === "ORDER" ? "ORDER" : "INQUIRY";

    setTab(ACTIVE_TAB);
    bindUI();

    await refreshThreads({ keepSelection: false });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
