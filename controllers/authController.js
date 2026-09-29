const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const prisma = require('../config/db');

const VERIFICATION_CODE_EXPIRY_MINUTES = 10;

// =====================================================
// EMAIL TRANSPORTER
// =====================================================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// =====================================================
// HELPERS
// =====================================================

function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function getVerificationExpiry() {
  return new Date(
    Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000
  );
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username).trim();
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_.]{3,30}$/.test(username);
}

function isValidVerificationCode(code) {
  return /^\d{6}$/.test(code);
}

async function sendVerificationEmail(email, code) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email service is not configured.');
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTA X Verification Code',
    text:
      `Your OTA X verification code is ${code}.\n\n` +
      `This code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.\n\n` +
      `If you did not create an OTA X account, you can ignore this email.`
  });
}


// =====================================================
// REGISTER
// =====================================================

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email and password are required.'
      });
    }

    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);

    if (!isValidUsername(normalizedUsername)) {
      return res.status(400).json({
        error:
          'Username must be 3-30 characters and may contain only letters, numbers, underscores and periods.'
      });
    }

    if (normalizedEmail.length > 254) {
      return res.status(400).json({
        error: 'Email address is too long.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.'
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {
            email: normalizedEmail
          },
          {
            username: normalizedUsername
          }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Username or email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = getVerificationExpiry();

    const newUser = await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        verificationCode,
        verificationCodeExpiresAt,
        isVerified: false
      }
    });

    try {
      await sendVerificationEmail(
        normalizedEmail,
        verificationCode
      );
    } catch (emailError) {
      console.error(
        'REGISTER EMAIL ERROR:',
        emailError
      );

      // Do not leave an account that cannot receive
      // its required verification email.
      await prisma.user.delete({
        where: {
          id: newUser.id
        }
      });

      return res.status(503).json({
        error:
          'We could not send your verification email. Please try again later.'
      });
    }

    return res.status(201).json({
      message:
        'Registration successful. Please check your email for your verification code.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified
      }
    });

  } catch (error) {
    console.error(
      'REGISTER ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Server error during registration.'
    });
  }
};


// =====================================================
// VERIFY EMAIL
// =====================================================

exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        error: 'Email and verification code are required.'
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = String(code).trim();

    if (!isValidVerificationCode(normalizedCode)) {
      return res.status(400).json({
        error: 'Verification code must be exactly 6 digits.'
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        error: 'This account is already verified.'
      });
    }

    if (
      !user.verificationCode ||
      !user.verificationCodeExpiresAt
    ) {
      return res.status(400).json({
        error:
          'There is no active verification code. Please request a new code.'
      });
    }

    if (
      new Date() >
      user.verificationCodeExpiresAt
    ) {
      return res.status(400).json({
        error:
          'Verification code has expired. Please request a new code.'
      });
    }

    if (user.verificationCode !== normalizedCode) {
      return res.status(400).json({
        error: 'Invalid verification code.'
      });
    }

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null
      }
    });

    return res.status(200).json({
      message:
        'Account verified successfully. You can now log in.'
    });

  } catch (error) {
    console.error(
      'VERIFY ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Server error during verification.'
    });
  }
};


// =====================================================
// RESEND VERIFICATION CODE
// =====================================================

exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required.'
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        error: 'This account is already verified.'
      });
    }

    const verificationCode =
      generateVerificationCode();

    const verificationCodeExpiresAt =
      getVerificationExpiry();

    try {
      await sendVerificationEmail(
        normalizedEmail,
        verificationCode
      );
    } catch (emailError) {
      console.error(
        'RESEND EMAIL ERROR:',
        emailError
      );

      return res.status(503).json({
        error:
          'We could not send the verification email. Please try again later.'
      });
    }

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        verificationCode,
        verificationCodeExpiresAt
      }
    });

    return res.status(200).json({
      message:
        'A new verification code has been sent to your email.'
    });

  } catch (error) {
    console.error(
      'RESEND VERIFICATION ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while sending verification code.'
    });
  }
};


// =====================================================
// LOGIN
// =====================================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid credentials.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error:
          'This account has been deactivated.'
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error:
          'Please verify your email address before logging in.'
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatches) {
      return res.status(400).json({
        error: 'Invalid credentials.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        'JWT_SECRET is not configured.'
      );

      return res.status(500).json({
        error:
          'Authentication service is not configured.'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    );

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        lastSeenAt: new Date()
      }
    });

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isCreatorVerified:
          user.isCreatorVerified
      }
    });

  } catch (error) {
    console.error(
      'LOGIN ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Server error during login.'
    });
  }
};
