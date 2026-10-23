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
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
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
  return String(username).trim().replace(/^@+/, "").toLowerCase();
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
    if (
      process.env.OTA_X_EMAIL_VERIFICATION_REQUIRED === 'false' &&
      !process.env.JWT_SECRET
    ) {
      return res.status(500).json({
        error: 'Authentication service is not configured.'
      });
    }

    const { firstName, lastName, dateOfBirth, username, displayName, email, phoneNumber, password } = req.body || {};

    if (!firstName || !lastName || !dateOfBirth || !username || !email || !phoneNumber || !password) {
      return res.status(400).json({
        error: 'First name, last name, date of birth, username, email, phone number and password are required.'
      });
    }

    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhoneNumber = String(phoneNumber).trim().replace(/[^\d+]/g, "");

    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhoneNumber)) {
      return res.status(400).json({
        error: "Enter a valid phone number including its international country code."
      });
    }

    if (typeof firstName !== "string" || !firstName.trim() || firstName.trim().length > 100 || typeof lastName !== "string" || !lastName.trim() || lastName.trim().length > 100) {
      return res.status(400).json({ error: "Enter a valid first name and last name (maximum 100 characters each)." });
    }

    if (typeof dateOfBirth !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return res.status(400).json({ error: "Date of birth must use YYYY-MM-DD format." });
    }

    const birthDate = new Date(dateOfBirth + "T00:00:00.000Z");
    if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== dateOfBirth || birthDate > new Date()) {
      return res.status(400).json({ error: "Enter a valid date of birth that is not in the future." });
    }

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (
      displayName !== undefined &&
      displayName !== null &&
      typeof displayName !== 'string'
    ) {
      return res.status(400).json({
        error: 'Display name must be text.'
      });
    }

    const normalizedDisplayName =
      typeof displayName === 'string' && displayName.trim()
        ? displayName.trim()
        : normalizedUsername;

    if (normalizedDisplayName.length > 50) {
      return res.status(400).json({
        error: 'Display name cannot exceed 50 characters.'
      });
    }

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

    if (typeof password !== "string" || password.length < 8) {
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
            username: { equals: normalizedUsername, mode: "insensitive" }
          },
          {
            phoneNumber: normalizedPhoneNumber
          }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Username, email or phone number already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = getVerificationExpiry();

    const newUser = await prisma.user.create({
      data: {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        dateOfBirth: birthDate,
        username: normalizedUsername,
        displayName: normalizedDisplayName,
        email: normalizedEmail,
        phoneNumber: normalizedPhoneNumber,
        password: hashedPassword,
        verificationCode,
        verificationCodeExpiresAt,
        isVerified: false
      }
    });

    if (process.env.OTA_X_EMAIL_VERIFICATION_REQUIRED !== 'false') {
      try {
        await sendVerificationEmail(normalizedEmail, verificationCode);
      } catch (emailError) {
        console.error('REGISTER EMAIL ERROR:', emailError);
        await prisma.user.delete({ where: { id: newUser.id } });
        return res.status(503).json({ error: 'We could not send your verification email. Please try again later.' });
      }
    }
    let token;

    if (process.env.OTA_X_EMAIL_VERIFICATION_REQUIRED === 'false') {
      token = jwt.sign(
        {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      await prisma.user.update({
        where: { id: newUser.id },
        data: { lastSeenAt: new Date() }
      });
    }

    return res.status(201).json({
      message: process.env.OTA_X_EMAIL_VERIFICATION_REQUIRED === 'false'
        ? 'Registration successful. You are now logged in.'
        : 'Registration successful. Please check your email for your verification code.',
      ...(token ? { token } : {}),
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        dateOfBirth: newUser.dateOfBirth,
        username: newUser.username,
        displayName: newUser.displayName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isVerified: newUser.isVerified,
        isCreatorVerified: newUser.isCreatorVerified
      }
    });

  } catch (error) {
    if (error && error.code === "P2002") {
      return res.status(409).json({
        error: "Username, email or phone number already exists."
      });
    }

    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      error: "Server error during registration."
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
    const { email, password } = req.body || {};

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

    if (
      process.env.OTA_X_EMAIL_VERIFICATION_REQUIRED !== 'false' &&
      !user.isVerified
    ) {
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

const PASSWORD_RESET_CODE_EXPIRY_MINUTES = 10;

function generatePasswordResetCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function getPasswordResetExpiry() {
  return new Date(
    Date.now() + PASSWORD_RESET_CODE_EXPIRY_MINUTES * 60 * 1000
  );
}

async function sendPasswordResetEmail(email, code) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTA X Password Reset Code',
    text: `Your OTA X password reset code is ${code}. It expires in ${PASSWORD_RESET_CODE_EXPIRY_MINUTES} minutes.`
  });
}

exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        error: 'Email is required.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    }

    const code = generatePasswordResetCode();
    const expiresAt = getPasswordResetExpiry();

    try {
      await sendPasswordResetEmail(email, code);
    } catch (emailError) {
      console.error('PASSWORD RESET EMAIL ERROR:', emailError);

      return res.status(503).json({
        error: 'Unable to send password reset email right now.'
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: code,
        passwordResetExpiresAt: expiresAt
      }
    });

    return res.status(200).json({
      message: 'If an account with that email exists, a password reset code has been sent.'
    });

  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error);

    return res.status(500).json({
      error: 'Server error while requesting password reset.'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: 'Email, reset code and new password are required.'
      });
    }

    if (!isValidVerificationCode(code)) {
      return res.status(400).json({
        error: 'Invalid reset code.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      return res.status(400).json({
        error: 'Invalid reset request.'
      });
    }

    if (!user.passwordResetCode || !user.passwordResetExpiresAt) {
      return res.status(400).json({
        error: 'No active password reset request.'
      });
    }

    if (new Date() > user.passwordResetExpiresAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetCode: null,
          passwordResetExpiresAt: null
        }
      });

      return res.status(400).json({
        error: 'Reset code has expired.'
      });
    }

    if (user.passwordResetCode !== code) {
      return res.status(400).json({
        error: 'Invalid reset code.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetCode: null,
        passwordResetExpiresAt: null
      }
    });

    return res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);

    return res.status(500).json({
      error: 'Server error while resetting password.'
    });
  }
};

// Check whether a username is available.
exports.checkUsernameAvailability = async (req, res) => {
  try {
    const rawUsername = req.query.username;

    if (typeof rawUsername !== 'string' || !rawUsername.trim()) {
      return res.status(400).json({
        error: 'Username is required.'
      });
    }

    const username = normalizeUsername(rawUsername);

    if (!isValidUsername(username)) {
      return res.status(400).json({
        available: false,
        error: 'Username must be 3-30 characters and may contain only letters, numbers, underscores and periods.'
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive'
        }
      },
      select: { id: true }
    });

    return res.status(200).json({
      username,
      available: !existingUser
    });
  } catch (error) {
    console.error('USERNAME AVAILABILITY ERROR:', error);

    return res.status(500).json({
      error: 'Could not check username availability. Please try again.'
    });
  }
};
