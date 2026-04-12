const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { issueTokens } = require('../../utils/token');

const SALT_ROUNDS = 10;

/**
 * Register a new user
 */
const register = async (userData) => {
  const { email, password, firstName, lastName, username } = userData;

  if (!email || !password || !firstName || !lastName) {
    throw new Error('Email, password, first name, and last name are required');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      username: username || `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`,
      passwordHash,
      role: 'MEMBER', // Default role
    },
  });

  const tokens = issueTokens(user);
  return { user, ...tokens };
};

/**
 * Login a user
 */
const login = async (credentials) => {
  const { email, password } = credentials;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const tokens = issueTokens(user);
  return { user, ...tokens };
};

module.exports = {
  register,
  login,
};
