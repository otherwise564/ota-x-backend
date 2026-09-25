const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check that all required fields were provided
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email and password are required.'
      });
    }

    // Check whether the username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Username or email already exists.'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword
      }
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    // Show the real error in Render logs while debugging
    console.error('REGISTER ERROR:', error);

    return res.status(500).json({
      error: 'Server error during registration.',
      details: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check that all required fields were provided
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: {
        email: email
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid credentials.'
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid credentials.'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'default_jwt_secret',
      {
        expiresIn: '1d'
      }
    );

    return res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    // Show the real error in Render logs while debugging
    console.error('LOGIN ERROR:', error);

    return res.status(500).json({
      error: 'Server error during login.',
      details: error.message
    });
  }
};
