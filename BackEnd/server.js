// BackEnd/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(cors()); // GoLive runs on another port; keep it open during dev
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploads (images) if you use multer
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------- ROUTES --------------------
let authRoutes;
try {
  authRoutes = require("./routes/authRoutes");
  app.use("/api/auth", authRoutes);
} catch (e) {
  console.warn("⚠️ authRoutes not mounted:", e.message);
}

let tailorRoutes;
try {
  tailorRoutes = require("./routes/tailorRoutes");
  app.use("/api/tailors", tailorRoutes);
} catch (e) {
  console.warn("⚠️ tailorRoutes not mounted:", e.message);
}

// Optional: orders route (only if you actually have it)
// If you don't have it, server should still run fine.
try {
  const orderRoutes = require("./routes/orderRoutes");
  app.use("/api/orders", orderRoutes);
} catch {
  // ignore
}

// -------------------- HEALTH --------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "TailorCart API running" });
});

// IMPORTANT:
// ❌ Do NOT serve FrontEnd files from backend.
// Use GoLive for frontend.
// So no app.use(express.static("FrontEnd")) and no app.get("*") fallback.

// -------------------- START --------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ TailorCart API running at http://localhost:${PORT}`);
});
