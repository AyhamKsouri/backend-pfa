const express = require('express');
const router = express.Router();
const membersController = require('./members.controller');
const { protect } = require('../../middleware/auth.middleware');

// All member routes require authentication
router.use(protect);

/**
 * PATCH /api/members/:projectId/:userId/skills
 * Update a member's skills in a project
 * Restricted to the user themselves or an admin (enforced in controller)
 */
router.patch('/:projectId/:userId/skills', membersController.updateSkills);

module.exports = router;
