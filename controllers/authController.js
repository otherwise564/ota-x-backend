const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const prisma = require('../config/db');

const VERIFICATION_CODE_EXPIRY_MINUTES = 10;

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate a secure 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Calculate verification expiry time
function getVerificationExpiry() {
  return new Date(
    Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000
  );
}

// Send verification email
async function sendVerificationEmail(email, code) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTA X Verification Code',
    text: `Your OTA X verification code is ${code}. This code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.`
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

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        error: 'Username must be at least 3 characters long.'
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
          { email: normalizedEmail },
          { username: normalizedUsername }
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

    /*
     * Create the account as UNVERIFIED.
     * The account remains in PostgreSQL and cannot log in
     * until the email verification succeeds.
     */
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
      console.error('EMAIL SENDING ERROR:', emailError);

      /*
       * Email delivery failed.
       * Remove the newly-created account so the user can safely
       * try registration again instead of being left with an
       * unusable unverified account.
       */
      await prisma.user.delete({
        where: {
          id: newUser.id
        }
      });

      return res.status(503).json({
        error: 'We could not send the verification email. Please try again.'
      });
    }

    return res.status(201).json({
      message: 'Registration successful. Please check your email for your verification code.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified
      }
    });

  } catch (error) {
    console.error('REGISTER ERROR:', error);

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

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = String(code).trim();

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

    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      return res.status(400).json({
        error: 'No active verification code. Please request a new code.'
      });
    }

    if (new Date() > user.verificationCodeExpiresAt) {
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.'
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
      message: 'Account verified successfully. You can now log in.'
    });

  } catch (error) {
    console.error('VERIFY ERROR:', error);

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

    const normalizedEmail = email.trim().toLowerCase();

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

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = getVerificationExpiry();

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        verificationCode,
        verificationCodeExpiresAt
      }
    });

    try {
      await sendVerificationEmail(
        normalizedEmail,
        verificationCode
      );
    } catch (emailError) {
      console.error('RESEND EMAIL ERROR:', emailError);

      return res.status(503).json({
        error: 'We could not send the verification email. Please try again later.'
      });
    }

    return res.status(200).json({
      message: 'A new verification code has been sent to your email.'
    });

  } catch (error) {
    console.error('RESEND VERIFICATION ERROR:', error);

    return res.status(500).json({
      error: 'Server error while sending verification code.'
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

    const normalizedEmail = email.trim().toLowerCase();

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

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in.'
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid credentials.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured.');

      return res.status(500).json({
        error: 'Authentication service is not configured.'
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

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isCreatorVerified: user.isCreatorVerified
      }
    });

  } catch (error) {
    console.error('LOGIN ERROR:', error);

    return res.status(500).json({
      error: 'Server error during login.'
    });
  }
};
