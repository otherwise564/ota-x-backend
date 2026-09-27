const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const prisma = require('../config/db');

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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

    // Generate a random 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create the user with verification fields
    const newUser = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
        verificationCode: verificationCode,
        isVerified: false
      }
    });

    // Send the verification email
    try {
      await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'OTA X Verification Code',
          text: `Your verification code for OTA X is: ${verificationCode}`
      });
    } catch (emailError) {
      console.error('EMAIL SENDING ERROR:', emailError);
      // We still let registration succeed, but log the email error
    }

    return res.status(201).json({
      message: 'Registration successful! Please check your email for the verification code.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('REGISTER ERROR:', error);
    return res.status(500).json({
      error: 'Server error during registration.',
      details: error.message
    });
  }
};

// New Verify Code Function
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Update user to verified and clear the code
    await prisma.user.update({
      where: { email: email },
      data: {
        isVerified: true,
        verificationCode: null
      }
    });

    return.status(200).json({ message: 'Account verified successfully! You can now log in.' });

  } catch (error) {
    console.error('VERIFY ERROR:', error);
    return res.status(500).json({
      error: 'Server error during verification.',
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

    // Check if the user has verified their email
    if (!user.isVerified) {
      return res.status(400).json({
        error: 'Please verify your email address before logging in.'
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
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({
      error: 'Server error during login.',
      details: error.message
    });
  }
};
                             
