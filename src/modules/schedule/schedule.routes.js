const express = require('express');
const router = express.Router();
const scheduleController = require('./schedule.controller');
const { protect } = require('../../middleware/auth.middleware');
const { projectIdQueryValidation } = require('../../middleware/validation.middleware');

// All schedule routes require authentication
router.use(protect);

// GET /api/schedule - Get project schedule (tasks with dates, assignments, dependencies)
// Uses ?projectId=X query parameter
router.get('/', projectIdQueryValidation, scheduleController.getSchedule);

module.exports = router;
