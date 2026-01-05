// BackEnd/controllers/authController.js
const bcrypt = require("bcryptjs");

// ✅ robust datastore loader (won't crash if path differs)
function loadStore() {
  const candidates = ["../data/dataStore", "../models/dataStore", "../dataStore"];
  for (const p of candidates) {
    try {
      return require(p);
    } catch {}
  }

  // Fallback in-memory store (so backend runs no matter what)
  if (!global.__TC_STORE__) {
    global.__TC_STORE__ = {
      users: [],
      tailors: [],
      orders: [],
      nextIds: {
        _u: 1,
        _t: 1,
        _o: 1,
        getNextUserId() {
          return this._u++;
        },
        getNextTailorId() {
          return this._t++;
        },
        getNextOrderId() {
          return this._o++;
        },
      },
    };
  }
  return global.__TC_STORE__;
}

const store = loadStore();
const users = store.users || (store.users = []);
const nextIds =
  store.nextIds ||
  (store.nextIds = {
    _u: 1,
    getNextUserId() {
      return this._u++;
    },
  });

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const exists = users.find(
      (u) => String(u.email || "").toLowerCase() === String(email).toLowerCase()
    );
    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = {
      id: typeof nextIds.getNextUserId === "function" ? nextIds.getNextUserId() : Date.now(),
      name,
      email,
      password: hashed,
      role: String(role).toLowerCase(),

      // ✅ add addresses container (empty)
      addresses: [],
    };

    users.push(newUser);

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
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

    const user = users.find(
      (u) => String(u.email || "").toLowerCase() === String(email).toLowerCase()
    );
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password);
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
const getAddresses = (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const user = users.find((u) => String(u.id) === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!Array.isArray(user.addresses)) user.addresses = [];
  return res.json({ addresses: user.addresses });
};

// ✅ PUT /api/auth/addresses?userId=123  { addresses: [...] }
const putAddresses = (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const user = users.find((u) => String(u.id) === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const addresses = req.body?.addresses;
  if (!Array.isArray(addresses)) return res.status(400).json({ error: "addresses must be an array" });

  user.addresses = addresses;
  return res.json({ message: "Addresses updated", addresses: user.addresses });
};

module.exports = { signup, login, getAddresses, putAddresses };
