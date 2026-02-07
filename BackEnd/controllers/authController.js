// BackEnd/controllers/authController.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// Helper: next numeric id
async function getNextUserId() {
  const last = await User.findOne().sort({ id: -1 }).select("id").lean();
  return (last?.id || 0) + 1;
}

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const emailNorm = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: emailNorm }).lean();
    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const newUser = await User.create({
      id: await getNextUserId(),
      name: String(name).trim(),
      email: emailNorm,
      password: hashed,
      role: String(role).toLowerCase(),
      addresses: [], // ✅ keep addresses
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailNorm = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: emailNorm }).lean();
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(String(password), String(user.password));
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    return res.json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ GET /api/auth/addresses?userId=123
const getAddresses = async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const user = await User.findOne({ id: userId }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ addresses: Array.isArray(user.addresses) ? user.addresses : [] });
  } catch (err) {
    console.error("getAddresses error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ PUT /api/auth/addresses?userId=123  { addresses: [...] }
const putAddresses = async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const addresses = req.body?.addresses;
    if (!Array.isArray(addresses)) {
      return res.status(400).json({ error: "addresses must be an array" });
    }

    const updated = await User.findOneAndUpdate(
      { id: userId },
      { $set: { addresses } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "User not found" });

    return res.json({ message: "Addresses updated", addresses: updated.addresses || [] });
  } catch (err) {
    console.error("putAddresses error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { signup, login, getAddresses, putAddresses };
