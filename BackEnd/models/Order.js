// BackEnd/models/Order.js
const mongoose = require("mongoose");

const QuoteSchema = new mongoose.Schema(
  {
    price: { type: Number, default: null },
    deliveryDays: { type: Number, default: null },
    expectedDeliveryDate: { type: String, default: null },
    note: { type: String, default: "" },
    quotedAt: { type: String, default: null },
  },
  { _id: false }
);

const PaymentSchema = new mongoose.Schema(
  {
    advancePaid: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
  },
  { _id: false }
);

const HistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    at: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    // numeric order id your frontend expects
    id: { type: Number, unique: true, index: true, required: true },

    // customer user id (string in your auth)
    userId: { type: String, default: null, index: true },

    // tailor numeric id (your Tailor model uses id:Number)
    tailorId: { type: Number, required: true, index: true },

    garmentType: { type: String, required: true },
    fabricOption: { type: String, default: "customer" }, // customer|tailor
    measurementMethod: { type: String, default: "tailor" }, // tailor|manual
    measurements: { type: Object, default: {} },

    address: { type: Object, required: true },
    preferredDate: { type: String, default: null },
    preferredTimeSlot: { type: String, default: "any" },

    designNotes: { type: String, default: "" },
    designImageUrl: { type: String, default: null },

    quote: { type: QuoteSchema, default: () => ({}) },
    payments: { type: PaymentSchema, default: () => ({}) },

    status: { type: String, default: "REQUESTED", index: true },
    history: { type: [HistorySchema], default: [] },

    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },

    reviewId: { type: Number, default: null },

  },
  { timestamps: false }
);

module.exports = mongoose.model("Order", OrderSchema);
