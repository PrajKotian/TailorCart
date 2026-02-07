const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // Numeric ID (kept for frontend compatibility)
    id: {
      type: Number,
      unique: true,
      index: true,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      index: true,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Password is hashed using bcrypt (already handled in controller)
    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["customer", "tailor", "admin"],
      default: "customer",
    },

    // ✅ Addresses (used in profile + checkout)
    addresses: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
