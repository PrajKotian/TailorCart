// BackEnd/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const tailorRoutes = require("./routes/tailorRoutes");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- BASIC ROUTES ----------
app.get("/", (req, res) => {
  res.send("TailorCart backend is running. Use /api/health to check status.");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TailorCart backend is running" });
});

// ---------- AUTH ROUTES ----------
app.use("/api/auth", authRoutes);

// ---------- TAILOR ROUTES ----------
app.use("/api/tailors", tailorRoutes);

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TailorCart backend running on http://localhost:${PORT}`);
});
