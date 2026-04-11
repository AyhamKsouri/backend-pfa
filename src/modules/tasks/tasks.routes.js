const express = require('express');
const router = express.Router();
const tasksController = require('./tasks.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');
const { taskStatusValidation } = require('../../middleware/validation.middleware');
const { validateUpdateProgress } = require('../../validators/task.validator');

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management
 */

// All task routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get tasks assigned to current user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks
 */
// GET /tasks - Get tasks assigned to current user
router.get('/', tasksController.getMyTasks);

/**
 * @swagger
 * /api/tasks/projects/{projectId}:
 *   get:
 *     summary: Get tasks by project ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tasks in project
 */
// GET /tasks/projects/:projectId - Get tasks by project
router.get('/projects/:projectId', tasksController.getTasks);

/**
 * @swagger
 * /api/tasks/projects/{projectId}:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created
 *       403:
 *         description: Forbidden - Admin only
 */
// POST /tasks/projects/:projectId - Create a new task (Admin only)
router.post('/projects/:projectId', authorize('ADMIN'), tasksController.createTask);

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   patch:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated
 */
// PATCH /tasks/:taskId - Update a task (Admin only)
router.patch('/:taskId', authorize('ADMIN'), tasksController.updateTask);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   put:
 *     summary: Update task status
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, COMPLETED]
 *     responses:
 *       200:
 *         description: Status updated
 */
// PUT /tasks/:id/status - Update task status (security-restricted)
router.put('/:id/status', taskStatusValidation, tasksController.updateStatus);

/**
 * @swagger
 * /api/tasks/{id}/progress:
 *   put:
 *     summary: Update task progress
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - progress
 *             properties:
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Progress updated
 */
// PUT /tasks/:id/progress - Update task progress (security-restricted)
router.put('/:id/progress', validateUpdateProgress, tasksController.updateProgress);

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */
// DELETE /tasks/:taskId - Delete a task (Admin only)
router.delete('/:taskId', authorize('ADMIN'), tasksController.deleteTask);

module.exports = router;
