const authService = require('./auth.service');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Login a user
 */
const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
};
