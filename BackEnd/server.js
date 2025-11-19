// BackEnd/server.js
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const tailorRoutes = require("./routes/tailorRoutes");
const { tailors } = require("./models/dataStore");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- BASIC ROUTES ----------
app.get("/", (req, res) => {
  res.send("TailorCart backend is running. Use /api/health to check status.");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TailorCart backend is running" });
});

// ---------- AUTH ROUTES ----------
app.use("/api/auth", authRoutes);

// ---------- TAILOR ROUTES (READ ONLY FOR NOW) ----------

app.use("/api/tailors", tailorRoutes);

// Get all tailors (Find Tailors page)
app.get("/api/tailors", (req, res) => {
  res.json(tailors);
});

// Get one tailor (Tailor Profile page)
app.get("/api/tailors/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tailor = tailors.find((t) => t.id === id);

  if (!tailor) {
    return res.status(404).json({ error: "Tailor not found" });
  }

  res.json(tailor);
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TailorCart backend running on http://localhost:${PORT}`);
});
