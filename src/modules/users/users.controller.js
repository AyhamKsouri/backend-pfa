const prisma = require('../../config/prisma');

/**
 * Get all users
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  // Authorization check: Only user can see their own details OR Admin
  if (req.user.id !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Access to another user details is restricted' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update user
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  // 1. Ownership/Role Authorization Check
  if (req.user.id !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
  }

  // 2. Mass Assignment Protection via Whitelisting
  const allowedFields = ['firstName', 'lastName', 'email', 'username'];
  if (req.user.role === 'ADMIN') {
    allowedFields.push('role');
  }

  // 3. Prevent unauthorized role changes (Explicit Check)
  if (req.body.role && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to change user roles' });
  }

  // 4. Build update data from whitelist
  const updateData = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No valid update fields provided' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(200).json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    console.error(`Error updating user ${userId}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  // Ownership/Role Authorization Check: Only Owner or Admin can delete
  if (req.user.id !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: You can only delete your own account' });
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    console.error(`Error deleting user ${userId}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
