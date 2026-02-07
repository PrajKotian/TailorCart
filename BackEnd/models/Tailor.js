const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    title: String,
    priceFrom: Number,
    duration: String,
    description: String,
  },
  { _id: false }
);

const TailorSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true, required: true },

    userId: { type: String, default: null, index: true },

    name: { type: String, required: true },
    email: { type: String, default: "" },
    city: { type: String, default: "" },
    area: { type: String, default: "" },

    experienceYears: { type: Number, default: 0 },
    startingPrice: { type: Number, default: 0 },
    gender: { type: String, default: "" },

    rating: { type: Number, default: 4.5 },
    specializations: { type: [String], default: [] },
    about: { type: String, default: "" },

    services: { type: [ServiceSchema], default: [] },
    profileImageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tailor", TailorSchema);
