// BackEnd/controllers/authController.js

const { users, nextIds } = require("../models/dataStore");

// POST /api/auth/signup
const signup = (req, res) => {
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

  const newUser = {
    id: nextIds.getNextUserId(),
    name,
    email,
    password, // plain text for now (later we'll hash it)
    role      // "customer" or "tailor"
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
};

// POST /api/auth/login
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({
    message: "Login successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

module.exports = {
  signup,
  login
};
