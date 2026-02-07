// FrontEnd/scripts/customer-chat.js
(() => {
  "use strict";

  const API_BASE = window.API_BASE_URL || "http://localhost:5000";

  const $ = (id) => document.getElementById(id);

  const els = {
    backBtn: $("tcBackBtn"),
    avatar: $("tcAvatar"),
    title: $("tcTitle"),
    subtitle: $("tcSubtitle"),
    me: $("tcMe"),

    body: $("tcChatBody"),

    attachBtn: $("tcAttachBtn"),
    file: $("tcFile"),
    text: $("tcText"),
    sendBtn: $("tcSendBtn"),
    err: $("tcErr"),
  };

  let ME = null;
  let CID = null;
  let POLL = null;
  let LAST_COUNT = 0;

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
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function showErr(msg) {
    if (!els.err) return;
    if (!msg) {
      els.err.classList.add("d-none");
      els.err.textContent = "";
      return;
    }
    els.err.textContent = msg;
    els.err.classList.remove("d-none");
  }

  async function api(path, options = {}) {
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
    const u = window.AuthStore?.getCurrentUser?.();
    if (u?.id) return { ...u, role: (u.role || "customer").toLowerCase() };

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

  function getCID() {
    const u = new URL(window.location.href);
    const cid = u.searchParams.get("cid");
    return cid ? String(cid) : null;
  }

  async function loadMeta() {
    // We can infer meta from inbox item
    const inbox = await api(`/api/chat/inbox?role=customer&userId=${encodeURIComponent(ME.id)}&tab=all`);
    const list = Array.isArray(inbox) ? inbox : [];
    const convo = list.find((x) => String(x.id) === String(CID));

    if (convo) {
      els.title.textContent = convo.title || "Chat";
      els.subtitle.textContent = convo.subtitle || "";
      const letter = (convo.title || "T").trim().charAt(0).toUpperCase();
      els.avatar.textContent = letter;
      return;
    }

    // fallback
    els.title.textContent = "Chat";
    els.subtitle.textContent = "Conversation";
    els.avatar.textContent = "T";
  }

  function scrollToBottom() {
    if (!els.body) return;
    els.body.scrollTop = els.body.scrollHeight;
  }

  function renderMessage(m) {
    const mine = String(m.senderRole || "") === "customer" && String(m.senderId) === String(ME.id);
    const rowClass = mine ? "tc-msg-row me" : "tc-msg-row";
    const bubbleClass = mine ? "tc-bubble me" : "tc-bubble";

    let content = "";
    if (m.kind === "image" && m.attachment?.url) {
      content = `
        <div class="mb-2">
          <a href="${esc(m.attachment.url)}" target="_blank" class="text-decoration-none">
            <img src="${esc(m.attachment.url)}" alt="image" style="max-width:100%; border-radius:14px; border:1px solid rgba(15,23,42,.08);" />
          </a>
        </div>
        ${m.text ? `<div>${esc(m.text)}</div>` : ""}
      `;
    } else if (m.kind === "video" && m.attachment?.url) {
      content = `
        <div class="mb-2">
          <video controls style="max-width:100%; border-radius:14px; border:1px solid rgba(15,23,42,.08);">
            <source src="${esc(m.attachment.url)}" type="${esc(m.attachment.mime || "video/mp4")}" />
          </video>
        </div>
        ${m.text ? `<div>${esc(m.text)}</div>` : ""}
      `;
    } else if (m.kind === "file" && m.attachment?.url) {
      content = `
        <div class="mb-2">
          <a class="tc-attach" href="${esc(m.attachment.url)}" target="_blank">
            📎 <span>${esc(m.attachment.name || "File")}</span>
          </a>
        </div>
        ${m.text ? `<div>${esc(m.text)}</div>` : ""}
      `;
    } else {
      content = `<div>${esc(m.text || "")}</div>`;
    }

    return `
      <div class="${rowClass}">
        <div class="${bubbleClass}">
          ${content}
          <div class="tc-time">${esc(fmtTime(m.createdAt))}</div>
        </div>
      </div>
    `;
  }

  async function loadMessages({ keepScroll = false } = {}) {
    const list = await api(`/api/chat/messages/${encodeURIComponent(CID)}`);
    const msgs = Array.isArray(list) ? list : [];

    // first render
    if (!keepScroll) {
      els.body.innerHTML = msgs.map(renderMessage).join("") || `<div class="small tc-muted">No messages yet. Say hi 👋</div>`;
      scrollToBottom();
      LAST_COUNT = msgs.length;
      return;
    }

    // keepScroll render (polling)
    if (msgs.length !== LAST_COUNT) {
      const atBottom = Math.abs(els.body.scrollHeight - els.body.scrollTop - els.body.clientHeight) < 80;
      els.body.innerHTML = msgs.map(renderMessage).join("") || `<div class="small tc-muted">No messages yet. Say hi 👋</div>`;
      LAST_COUNT = msgs.length;
      if (atBottom) scrollToBottom();
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function sendMessage() {
    showErr("");

    const text = String(els.text.value || "").trim();
    const file = els.file.files && els.file.files[0] ? els.file.files[0] : null;

    if (!text && !file) return;

    els.sendBtn.disabled = true;
    els.attachBtn.disabled = true;

    try {
      let attachment = null;

      if (file) {
        // limit (simple) ~ 8MB client side
        const max = 8 * 1024 * 1024;
        if (file.size > max) throw new Error("File too large (max 8MB).");

        const data = await fileToBase64(file);
        attachment = { data, name: file.name, mime: file.type || "application/octet-stream" };
      }

      await api(`/api/chat/messages`, {
        method: "POST",
        body: JSON.stringify({
          conversationId: CID,
          senderRole: "customer",
          senderId: ME.id,
          text,
          attachment,
        }),
      });

      // clear
      els.text.value = "";
      els.file.value = "";

      await loadMessages({ keepScroll: false });
    } catch (e) {
      showErr(e?.message || "Failed to send message.");
    } finally {
      els.sendBtn.disabled = false;
      els.attachBtn.disabled = false;
    }
  }

  function startPolling() {
    if (POLL) clearInterval(POLL);
    POLL = setInterval(() => {
      loadMessages({ keepScroll: true }).catch(() => {});
    }, 2500);
  }

  async function init() {
    ME = getMe();
    if (!ME) {
      window.location.href = "login.html";
      return;
    }
    if ((ME.role || "").toLowerCase() !== "customer") {
      window.location.href = "tailor-dashboard.html";
      return;
    }

    CID = getCID();
    if (!CID) {
      window.location.href = "customer-inbox.html";
      return;
    }

    els.me.textContent = ME.email || ME.name || "Customer";

    els.backBtn?.addEventListener("click", () => {
      window.location.href = "customer-inbox.html";
    });

    els.attachBtn?.addEventListener("click", () => {
      els.file.click();
    });

    // Enter to send
    els.text?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    els.sendBtn?.addEventListener("click", sendMessage);

    // Load UI meta + messages
    await loadMeta();
    await loadMessages({ keepScroll: false });
    startPolling();

    // cleanup
    window.addEventListener("beforeunload", () => {
      if (POLL) clearInterval(POLL);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
