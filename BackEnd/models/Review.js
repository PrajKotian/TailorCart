// BackEnd/models/Review.js
const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    // numeric review id (like your Order/Tailor ids)
    id: { type: Number, unique: true, index: true, required: true },

    // one review per order
    orderId: { type: Number, unique: true, index: true, required: true },

    tailorId: { type: Number, index: true, required: true },
    customerId: { type: String, index: true, required: true },

    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true },

    createdAt: { type: String, required: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model("Review", ReviewSchema);
