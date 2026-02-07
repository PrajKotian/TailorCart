// Conversation.js
const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: ["customer", "tailor"], required: true },
    lastReadAt: { type: Date, default: null },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    customerId: { type: String, default: null },
    tailorId: { type: String, default: null }, // tailor profile id
    orderId: { type: String, default: null },

    participants: { type: [ParticipantSchema], default: [] },

    // cached snapshots (fast inbox)
    tailorName: { type: String, default: "" },
    tailorAvatarUrl: { type: String, default: "" },

    // ✅ NEW: customer snapshot (so tailor inbox can show name without extra DB)
    customerName: { type: String, default: "" },
    customerAvatarUrl: { type: String, default: "" },

    // unread counters
    unreadCustomer: { type: Number, default: 0 },
    unreadTailor: { type: Number, default: 0 },

    // last message preview
    lastMessageText: { type: String, default: "" },
    lastMessageAt: { type: Date, default: null },

    // ✅ NEW: chat lock snapshot (fast)
    locked: { type: Boolean, default: false },
    reviewId: { type: String, default: null },
  },
  { timestamps: true }
);

ConversationSchema.index(
  { customerId: 1, tailorId: 1, orderId: 1 },
  { unique: true, sparse: true }
);

ConversationSchema.index({ customerId: 1, lastMessageAt: -1, updatedAt: -1 });
ConversationSchema.index({ tailorId: 1, lastMessageAt: -1, updatedAt: -1 });

// ✅ helps fast update on review submit
ConversationSchema.index({ orderId: 1 });

module.exports = mongoose.model("Conversation", ConversationSchema);
