const express = require('express');
const router = express.Router();
const commentsController = require('./comments.controller');
const { protect } = require('../../middleware/auth.middleware');
const { commentValidation } = require('../../middleware/validation.middleware');

// All comment routes require authentication
router.use(protect);

// GET /api/comments/tasks/:taskId - Get all comments for a task
router.get('/tasks/:taskId', commentsController.getTaskComments);

// POST /api/comments/tasks/:id - Create a new comment with mentions
router.post('/tasks/:id', commentValidation, commentsController.postComment);

// POST /api/comments/tasks/:taskId - Create a new comment (Legacy)
router.post('/tasks/:taskId', commentsController.createComment);

// PATCH /api/comments/:commentId - Update a comment
router.patch('/:commentId', commentsController.updateComment);

// DELETE /api/comments/:commentId - Delete a comment
router.delete('/:commentId', commentsController.deleteComment);

module.exports = router;
