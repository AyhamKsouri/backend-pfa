const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { issueTokens } = require('../../utils/token');

const SALT_ROUNDS = 10;

/**
 * Register a new user
 */
const register = async (userData) => {
  const { email, password, username } = userData;

  if (!email || !password || !username) {
    throw new Error('Email, password, and username are required');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    throw new Error('User with this email or username already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      username,
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
