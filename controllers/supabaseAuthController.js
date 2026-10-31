const supabase = require('../config/supabase');
const prisma = require('../config/db');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function validPhone(value) {
  return /^\+[1-9]\d{7,14}$/.test(String(value || '').trim());
}

function validDateOfBirth(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date()
  );
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isVerified: user.isVerified,
    isCreatorVerified: user.isCreatorVerified
  };
}

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      username,
      displayName,
      email,
      phoneNumber,
      password
    } = req.body;

    const cleanEmail = normalizeEmail(email);
    const cleanUsername = normalizeUsername(username);
    const cleanPhone = String(phoneNumber || '').trim();
    const cleanFirstName = String(firstName || '').trim();
    const cleanLastName = String(lastName || '').trim();

    if (
      !cleanFirstName ||
      !cleanLastName ||
      !dateOfBirth ||
      !cleanUsername ||
      !cleanEmail ||
      !cleanPhone ||
      !password
    ) {
      return res.status(400).json({
        message: 'Please complete all required fields.'
      });
    }

    if (cleanFirstName.length > 100 || cleanLastName.length > 100) {
      return res.status(400).json({
        message: 'Names cannot exceed 100 characters.'
      });
    }

    if (!/^[a-z0-9_.]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({
        message: 'Username must be 3–30 characters using letters, numbers, underscores or periods.'
      });
    }

    if (!validDateOfBirth(dateOfBirth)) {
      return res.status(400).json({
        message: 'Please provide a valid date of birth.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: 'Please provide a valid email address.'
      });
    }

    if (!validPhone(cleanPhone)) {
      return res.status(400).json({
        message: 'Please use an international phone number, such as +2348012345678.'
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.'
      });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { username: cleanUsername },
          { phoneNumber: cleanPhone }
        ]
      },
      select: { id: true }
    });

    if (existing) {
      return res.status(409).json({
        message: 'That email, username or phone number is already registered.'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: String(password),
      options: {
        data: {
          firstName: cleanFirstName,
          lastName: cleanLastName,
          dateOfBirth,
          username: cleanUsername,
          displayName: String(displayName || '').trim(),
          phoneNumber: cleanPhone
        }
      }
    });

    if (error) {
      return res.status(400).json({
        message: error.message
      });
    }

    if (!data.user || !data.session) {
      return res.status(409).json({
        message: 'No active session was returned. Check the Supabase email-confirmation setting before trying again.'
      });
    }

    const profile = await prisma.user.upsert({
      where: { supabaseAuthId: data.user.id },
      update: {},
      create: {
        supabaseAuthId: data.user.id,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`),
        username: cleanUsername,
        displayName: String(displayName || '').trim() || `${cleanFirstName} ${cleanLastName}`,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        password: null,
        isVerified: Boolean(data.user.email_confirmed_at),
        isActive: true
      }
    });

    return res.status(201).json({
      message: 'OTA X account created successfully.',
      token: data.session.access_token,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: publicUser(profile)
    });
  } catch (error) {
    console.error('OTA X registration error:', error);

    return res.status(500).json({
      message: 'Registration failed. Please try again.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user || !data.session) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const profile = await prisma.user.findUnique({
      where: { supabaseAuthId: data.user.id }
    });

    if (!profile) {
      return res.status(403).json({
        message: 'Your OTA X profile could not be found.'
      });
    }

    if (!profile.isActive) {
      return res.status(403).json({
        message: 'This account is currently disabled.'
      });
    }

    await prisma.user.update({
      where: { id: profile.id },
      data: { lastSeenAt: new Date() }
    });

    return res.json({
      message: 'Login successful.',
      token: data.session.access_token,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: publicUser(profile)
    });
  } catch (error) {
    console.error('OTA X login error:', error);

    return res.status(500).json({
      message: 'Login failed. Please try again.'
    });
  }
};
