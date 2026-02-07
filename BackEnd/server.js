// BackEnd/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// chat route
const chatRoutes = require("./routes/chatRoutes");
app.use("/api/chat", chatRoutes);

// -------------------- ROUTES --------------------
try {
  app.use("/api/auth", require("./routes/authRoutes"));
} catch (e) {
  console.warn("⚠️ authRoutes not mounted:", e.message);
}

try {
  app.use("/api/tailors", require("./routes/tailorRoutes"));
} catch (e) {
  console.warn("⚠️ tailorRoutes not mounted:", e.message);
}

try {
  app.use("/api/orders", require("./routes/orderRoutes"));
} catch (e) {
  console.warn("⚠️ orderRoutes not mounted:", e.message);
}

try {
  app.use("/api/reviews", require("./routes/reviewRoutes"));
} catch (e) {
  console.warn("⚠️ reviewRoutes not mounted:", e.message);
}

try {
  app.use("/api/chat", require("./routes/chatRoutes"));
} catch (e) {
  console.warn("⚠️ chatRoutes not mounted:", e.message);
}

// -------------------- HEALTH --------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "TailorCart API running" });
});

// -------------------- START SERVER --------------------
const PORT = Number(process.env.PORT) || 3000;

(async () => {
  try {
    await connectDB(); // db.js already logs success

    const server = app.listen(PORT, () => {
      console.log(`✅ TailorCart API running at http://localhost:${PORT}`);
    });

    // ✅ Properly handle EADDRINUSE instead of hacks
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `❌ Port ${PORT} is already in use.\n` +
            `✅ Fix: close the other running node process OR use a different PORT in .env`
        );
        process.exit(1);
      } else {
        console.error("❌ Server error:", err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err.message);
    process.exit(1);
  }
})();
