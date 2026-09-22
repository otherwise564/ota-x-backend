// Auth controller handlers

exports.register = (req, res) => {
  const { username, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  // Simulated registration response (database integration comes next)
  res.status(201).json({
    message: "User registered successfully",
    user: {
      username: username || "New User",
      email: email,
      role: "user"
    }
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  // Simulated login response with mock token
  res.json({
    message: "Login successful",
    token: "mock-jwt-token-ota-x",
    user: {
      email: email
    }
  });
};

