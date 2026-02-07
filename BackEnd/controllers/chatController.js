// chatController.js
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Tailor = require("../models/Tailor");
const Order = require("../models/Order");

function toStr(v) {
  if (v === null || v === undefined) return null;
  return String(v);
}

function roleNorm(r) {
  const x = String(r || "").toLowerCase();
  return x === "customer" || x === "tailor" ? x : "";
}

function safeDate(d) {
  const x = d ? new Date(d) : null;
  return x && !Number.isNaN(x.getTime()) ? x : null;
}

// ✅ peer uses cached snapshot only
function buildPeerFast(conversation, viewerRole) {
  const role = roleNorm(viewerRole);

  // customer viewing -> peer is tailor
  if (role === "customer") {
    return {
      id: conversation.tailorId,
      name: conversation.tailorName || "Tailor",
      avatarUrl: conversation.tailorAvatarUrl || "",
      sub: "",
    };
  }

  // tailor viewing -> peer is customer (use snapshot if available)
  const cid = conversation.customerId;
  return {
    id: cid,
    name: conversation.customerName || (cid ? `Customer #${cid}` : "Customer"),
    avatarUrl: conversation.customerAvatarUrl || "",
    sub: "",
  };
}

/**
 * POST /api/chat/conversations/ensure
 * body: { customerId?, tailorUserId?, tailorId?, orderId?, viewerRole?, customerName?, customerAvatarUrl? }
 */
exports.ensureConversation = async (req, res) => {
  try {
    const { customerId, tailorUserId, tailorId, orderId, viewerRole, customerName, customerAvatarUrl } = req.body || {};

    let cId = toStr(customerId);
    let tId = toStr(tailorId);
    const oId = toStr(orderId);

    if (!tId && tailorUserId) {
      const t = await Tailor.findOne({ userId: toStr(tailorUserId) }).lean().catch(() => null);
      if (t) tId = toStr(t.id);
    }

    if ((!tId || !cId) && oId) {
      const order = await Order.findOne({ id: Number(oId) }).lean().catch(() => null);
      if (order) {
        if (!tId && order.tailorId != null) tId = toStr(order.tailorId);
        if (!cId && order.userId != null) cId = toStr(order.userId);
      }
    }

    if (!cId || !tId) {
      return res.status(400).json({ error: "customerId and tailorId are required (orderId optional)" });
    }

    let conv = await Conversation.findOne({ customerId: cId, tailorId: tId, orderId: oId || null });

    const t = await Tailor.findOne({ id: Number(tId) }).lean().catch(() => null);
    const tailorName = t?.name || "";
    const tailorAvatarUrl = t?.profileImageUrl || "";

    // ✅ lock state (from Order) only during ensure (rare, ok)
    let locked = false;
    let reviewId = null;
    if (oId) {
      const order = await Order.findOne({ id: Number(oId) }).select("reviewId").lean().catch(() => null);
      if (order?.reviewId) {
        locked = true;
        reviewId = String(order.reviewId);
      }
    }

    if (!conv) {
      conv = await Conversation.create({
        customerId: cId,
        tailorId: tId,
        orderId: oId || null,
        participants: [
          { userId: cId, role: "customer", lastReadAt: null },
          { userId: tId, role: "tailor", lastReadAt: null },
        ],
        tailorName,
        tailorAvatarUrl,

        // ✅ capture customer snapshot if sent
        customerName: String(customerName || "").trim(),
        customerAvatarUrl: String(customerAvatarUrl || "").trim(),

        unreadCustomer: 0,
        unreadTailor: 0,

        locked,
        reviewId,
      });
    } else {
      let dirty = false;

      if (!conv.tailorName && tailorName) { conv.tailorName = tailorName; dirty = true; }
      if (!conv.tailorAvatarUrl && tailorAvatarUrl) { conv.tailorAvatarUrl = tailorAvatarUrl; dirty = true; }

      // backfill customer snapshot if we got it
      const cn = String(customerName || "").trim();
      const ca = String(customerAvatarUrl || "").trim();
      if (!conv.customerName && cn) { conv.customerName = cn; dirty = true; }
      if (!conv.customerAvatarUrl && ca) { conv.customerAvatarUrl = ca; dirty = true; }

      // sync locked if review exists
      if (locked && !conv.locked) { conv.locked = true; dirty = true; }
      if (reviewId && !conv.reviewId) { conv.reviewId = reviewId; dirty = true; }

      if (dirty) await conv.save();
    }

    const peer = buildPeerFast(conv, viewerRole || "customer");

    return res.json({
      conversation: { id: conv._id, ...conv.toObject() },
      peer,
    });
  } catch (e) {
    console.error("ensureConversation error:", e);
    return res.status(500).json({ error: "Failed to ensure conversation" });
  }
};

/**
 * GET /api/chat/inbox?userId=...&role=customer|tailor
 * FAST: 1 query total.
 */
exports.getInbox = async (req, res) => {
  try {
    const userId = toStr(req.query.userId);
    const role = roleNorm(req.query.role);

    if (!userId || !role) {
      return res.status(400).json({ error: "userId and role are required" });
    }

    const q = role === "customer" ? { customerId: userId } : { tailorId: userId };

    const convs = await Conversation.find(q)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const out = convs.map((c) => {
      const unreadCount = role === "customer" ? (c.unreadCustomer || 0) : (c.unreadTailor || 0);

      return {
        id: c._id,
        peer: buildPeerFast(c, role),
        lastMessage: { text: c.lastMessageText || "", createdAt: c.lastMessageAt || c.updatedAt },
        unreadCount,
        context: {
          tailorId: c.tailorId,
          customerId: c.customerId,
          orderId: c.orderId,
          locked: Boolean(c.locked) || Boolean(c.reviewId),
          reviewId: c.reviewId || null,
        },
      };
    });

    return res.json(out);
  } catch (e) {
    console.error("getInbox error:", e);
    return res.status(500).json({ error: "Failed to load inbox" });
  }
};

// rest unchanged
exports.getConversation = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id).lean();
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    return res.json({ conversation: { id: conv._id, ...conv } });
  } catch (e) {
    return res.status(500).json({ error: "Failed to load conversation" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const convId = req.params.id;
    const after = safeDate(req.query.after);

    const q = { conversationId: convId };
    if (after) q.createdAt = { $gt: after };

    const list = await Message.find(q).sort({ createdAt: 1 }).limit(200).lean();
    return res.json(list);
  } catch (e) {
    console.error("getMessages error:", e);
    return res.status(500).json({ error: "Failed to load messages" });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const convId = req.params.id;
    const senderId = toStr(req.body.senderId);
    const senderRole = roleNorm(req.body.senderRole);
    const text = String(req.body.text || "").trim();

    if (!senderId || !senderRole) return res.status(400).json({ error: "senderId and senderRole required" });
    if (!text && !req.file) return res.status(400).json({ error: "text or file required" });

    const conv = await Conversation.findById(convId);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // ✅ Hard-block sending if locked
    if (conv.locked || conv.reviewId) {
      return res.status(403).json({ error: "Chat is closed after review submission" });
    }

    let attachmentUrl = "";
    let attachmentType = "";

    if (req.file) {
      attachmentUrl = `/uploads/chat/${req.file.filename}`;
      attachmentType = req.file.mimetype || "";
    }

    const msg = await Message.create({
      conversationId: conv._id,
      senderId,
      senderRole,
      text,
      attachmentUrl,
      attachmentType,
      createdAt: new Date(),
    });

    const preview =
      text ||
      (attachmentType.startsWith("image/") ? "📷 Photo" :
       attachmentType.startsWith("video/") ? "🎥 Video" : "📎 Attachment");

    conv.lastMessageText = preview;
    conv.lastMessageAt = msg.createdAt;

    if (senderRole === "customer") conv.unreadTailor = (conv.unreadTailor || 0) + 1;
    if (senderRole === "tailor") conv.unreadCustomer = (conv.unreadCustomer || 0) + 1;

    await conv.save();

    return res.status(201).json({ ok: true, message: msg });
  } catch (e) {
    console.error("sendMessage error:", e);
    return res.status(500).json({ error: e.message || "Failed to send message" });
  }
};

exports.markRead = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const role = roleNorm(req.body.role);
    const userId = toStr(req.body.userId);

    if (!role || !userId) return res.status(400).json({ error: "userId and role required" });

    const now = new Date();
    conv.participants = (conv.participants || []).map((p) => {
      if (p.role === role) return { ...p, lastReadAt: now };
      return p;
    });

    if (role === "customer") conv.unreadCustomer = 0;
    if (role === "tailor") conv.unreadTailor = 0;

    await conv.save();
    return res.json({ ok: true });
  } catch (e) {
    console.error("markRead error:", e);
    return res.status(500).json({ error: "Failed to mark read" });
  }
};
