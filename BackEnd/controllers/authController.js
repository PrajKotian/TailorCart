// BackEnd/controllers/authController.js

const bcrypt = require("bcryptjs");
const { users, nextIds } = require("../models/dataStore");

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if email already exists
    const existing = users.find((u) => u.email === email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10); // 10 = salt rounds

    const newUser = {
      id: nextIds.getNextUserId(),
      name,
      email,
      password: hashedPassword, // 🔐 stored as hash now
      role // "customer" or "tailor"
    };

    users.push(newUser);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    // Find user by email only
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // If password matches, login success
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  signup,
  login
};
