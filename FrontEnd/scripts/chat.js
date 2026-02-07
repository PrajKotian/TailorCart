// FrontEnd/scripts/chat.js
(() => {
  "use strict";

  const API_BASE = window.API_BASE_URL || "http://localhost:5000";
  const $ = (id) => document.getElementById(id);

  const els = {
    peerAvatar: $("tcPeerAvatar"),
    peerName: $("tcPeerName"),
    peerSub: $("tcPeerSub"),

    body: $("tcChatBody"),

    attachBtn: $("tcAttachBtn"),
    file: $("tcFile"),
    text: $("tcText"),
    sendBtn: $("tcSendBtn"),
    err: $("tcErr"),

    previewWrap: $("tcPreviewWrap"),
    previewBox: $("tcPreviewBox"),
  };

  let ME = null;
  let CONV_ID = null;
  let PEER = null; // {name, avatarUrl}
  let POLL = null;
  let LAST_TS = null;
  let ATTACH_FILE = null;

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setErr(msg = "") {
    if (!els.err) return;
    els.err.textContent = msg || "";
  }

  async function api(path, options = {}) {
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);

    const res = await fetch(API_BASE + path, {
      headers: { ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  function getParams() {
    const u = new URL(window.location.href);
    return {
      conversationId: u.searchParams.get("conversationId"),
      tailorId: u.searchParams.get("tailorId"),
      orderId: u.searchParams.get("orderId"),
    };
  }

  function renderPeer() {
    const name = PEER?.name || "Chat";
    const avatarUrl = PEER?.avatarUrl || "";
    if (els.peerName) els.peerName.textContent = name;
    if (els.peerSub) els.peerSub.textContent = CONV_ID ? `Conversation • ${CONV_ID}` : "—";

    if (!els.peerAvatar) return;

    if (avatarUrl) {
      els.peerAvatar.innerHTML = `<img src="${esc(avatarUrl)}" alt="avatar" />`;
    } else {
      els.peerAvatar.textContent = (name.trim()[0] || "T").toUpperCase();
    }
  }

  function fmtTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
  }

  function bubbleHtml(m) {
    const mine = String(m.senderId) === String(ME.id) && String(m.senderRole) === String(ME.role);
    const cls = mine ? "tc-bubble tc-me" : "tc-bubble tc-them";

    let attachment = "";
    if (m.attachmentUrl && m.attachmentType) {
      if (m.attachmentType.startsWith("image/")) {
        attachment = `
          <div class="mb-2">
            <img src="${esc(m.attachmentUrl)}" alt="img" style="max-width:100%; border-radius:12px; border:1px solid rgba(15,23,42,.12);" />
          </div>
        `;
      } else if (m.attachmentType.startsWith("video/")) {
        attachment = `
          <div class="mb-2">
            <video controls style="max-width:100%; border-radius:12px; border:1px solid rgba(15,23,42,.12);">
              <source src="${esc(m.attachmentUrl)}" type="${esc(m.attachmentType)}" />
            </video>
          </div>
        `;
      } else {
        attachment = `
          <div class="mb-2">
            <a href="${esc(m.attachmentUrl)}" target="_blank" rel="noreferrer">Download attachment</a>
          </div>
        `;
      }
    }

    const text = m.text ? `<div>${esc(m.text)}</div>` : "";
    const meta = `<div class="tc-meta">${esc(fmtTime(m.createdAt))}</div>`;

    return `<div class="${cls}">${attachment}${text}${meta}</div>`;
  }

  function scrollToBottom() {
    if (!els.body) return;
    els.body.scrollTop = els.body.scrollHeight;
  }

  function renderMessages(list, { append = false } = {}) {
    if (!els.body) return;
    const html = (list || []).map(bubbleHtml).join("");
    if (append) els.body.insertAdjacentHTML("beforeend", html);
    else els.body.innerHTML = html;
  }

  async function ensureConversation({ conversationId, tailorId, orderId }) {
    if (conversationId) {
      const data = await api(`/api/chat/conversations/${encodeURIComponent(conversationId)}`);
      return data;
    }

    // create/ensure
    const payload = {
      customerId: ME.role === "customer" ? String(ME.id) : null,
      tailorUserId: ME.role === "tailor" ? String(ME.id) : null,
      tailorId: tailorId ? String(tailorId) : null,
      orderId: orderId ? String(orderId) : null,
    };

    const data = await api(`/api/chat/conversations/ensure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return data;
  }

  async function loadAll() {
    const data = await api(`/api/chat/conversations/${encodeURIComponent(CONV_ID)}/messages`);
    return Array.isArray(data) ? data : data.messages || [];
  }

  async function markRead() {
    try {
      await api(`/api/chat/conversations/${encodeURIComponent(CONV_ID)}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: String(ME.id), role: String(ME.role) }),
      });
    } catch {
      // ignore
    }
  }

  async function poll() {
    if (!CONV_ID) return;
    try {
      const data = await api(
        `/api/chat/conversations/${encodeURIComponent(CONV_ID)}/messages?after=${encodeURIComponent(LAST_TS || "")}`
      );
      const list = Array.isArray(data) ? data : data.messages || [];
      if (list.length) {
        renderMessages(list, { append: Boolean(LAST_TS) });
        LAST_TS = list[list.length - 1]?.createdAt || LAST_TS;
        scrollToBottom();
        await markRead();
      }
    } catch (e) {
      // no spam
    }
  }

  function showPreview(file) {
    if (!els.previewWrap || !els.previewBox) return;

    if (!file) {
      els.previewWrap.classList.add("d-none");
      els.previewBox.innerHTML = "";
      return;
    }

    const type = file.type || "";
    const name = file.name || "file";

    els.previewWrap.classList.remove("d-none");

    if (type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      els.previewBox.innerHTML = `
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div class="small fw-semibold">Image</div>
            <div class="small text-muted">${esc(name)}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger" id="tcRemoveAttach">Remove</button>
        </div>
        <div class="mt-2">
          <img src="${url}" alt="preview" style="max-width:100%; border-radius:12px;" />
        </div>
      `;
    } else if (type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      els.previewBox.innerHTML = `
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div class="small fw-semibold">Video</div>
            <div class="small text-muted">${esc(name)}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger" id="tcRemoveAttach">Remove</button>
        </div>
        <div class="mt-2">
          <video controls style="max-width:100%; border-radius:12px;">
            <source src="${url}" type="${esc(type)}" />
          </video>
        </div>
      `;
    } else {
      els.previewBox.innerHTML = `
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div class="small fw-semibold">Attachment</div>
            <div class="small text-muted">${esc(name)}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger" id="tcRemoveAttach">Remove</button>
        </div>
      `;
    }

    setTimeout(() => {
      const btn = document.getElementById("tcRemoveAttach");
      if (btn) {
        btn.onclick = () => {
          ATTACH_FILE = null;
          if (els.file) els.file.value = "";
          showPreview(null);
        };
      }
    }, 0);
  }

  async function sendMessage() {
    setErr("");

    const text = String(els.text?.value || "").trim();
    if (!text && !ATTACH_FILE) {
      setErr("Type a message or attach a file.");
      return;
    }

    els.sendBtn.disabled = true;

    try {
      const form = new FormData();
      form.append("senderId", String(ME.id));
      form.append("senderRole", String(ME.role));
      form.append("text", text);
      if (ATTACH_FILE) form.append("file", ATTACH_FILE);

      const res = await fetch(`${API_BASE}/api/chat/conversations/${encodeURIComponent(CONV_ID)}/messages`, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to send");

      // clear input
      if (els.text) els.text.value = "";
      ATTACH_FILE = null;
      if (els.file) els.file.value = "";
      showPreview(null);

      // refresh quickly
      await poll();
    } catch (e) {
      setErr(e?.message || "Failed to send message.");
    } finally {
      els.sendBtn.disabled = false;
    }
  }

  async function init() {
    ME = window.AuthStore?.getCurrentUser?.();
    if (!ME) {
      window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
      return;
    }

    // normalize role string
    ME.role = String(ME.role || ME.activeRole || "").toLowerCase() || "customer";

    const { conversationId, tailorId, orderId } = getParams();

    const conv = await ensureConversation({ conversationId, tailorId, orderId });
    CONV_ID = conv?.conversation?.id || conv?.conversation?._id || conv?.id || conv?._id || conversationId;

    PEER = conv?.peer || conv?.conversation?.peer || null;
    renderPeer();

    // initial load
    const list = await loadAll();
    renderMessages(list, { append: false });
    LAST_TS = list[list.length - 1]?.createdAt || null;
    scrollToBottom();
    await markRead();

    // events
    els.attachBtn?.addEventListener("click", () => els.file?.click());
    els.file?.addEventListener("change", () => {
      const f = els.file.files?.[0] || null;
      ATTACH_FILE = f;
      showPreview(f);
    });

    els.sendBtn?.addEventListener("click", sendMessage);
    els.text?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // poll
    if (POLL) clearInterval(POLL);
    POLL = setInterval(poll, 2500);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
