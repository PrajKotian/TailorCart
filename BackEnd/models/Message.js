const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },

    senderId: { type: String, required: true },
    senderRole: { type: String, enum: ["customer", "tailor"], required: true },

    text: { type: String, default: "" },

    attachmentUrl: { type: String, default: "" },
    attachmentType: { type: String, default: "" }, // image/* or video/*

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);
