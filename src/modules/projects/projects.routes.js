const express = require('express');
const router = express.Router();
const projectsController = require('./projects.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');
const { projectCreationValidation } = require('../../middleware/validation.middleware');

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management
 */

// All project routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects for current user
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 */
// GET /projects - Get user's projects
router.get('/', projectsController.getProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         description: Project not found
 */
// GET /projects/:id - Get a single project
router.get('/:id', projectsController.getProject);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
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
 *               methodology:
 *                 type: string
 *                 enum: [AGILE, WATERFALL, SCRUM]
 *     responses:
 *       201:
 *         description: Project created
 */
// POST /projects - Create a new project (metadata only)
router.post('/', projectCreationValidation, projectsController.createProject);

/**
 * @swagger
 * /api/projects/{id}/plan:
 *   post:
 *     summary: Generate/Regenerate AI plan for project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI plan triggered
 *       403:
 *         description: Forbidden - Admin only
 */
// POST /projects/:id/plan - Generate/Regenerate AI plan for project (Admin only)
router.post('/:id/plan', authorize('ADMIN'), projectsController.triggerAIPlan);

/**
 * @swagger
 * /api/projects/{id}/methodology:
 *   patch:
 *     summary: Update project methodology
 *     tags: [Projects]
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
 *             properties:
 *               methodology:
 *                 type: string
 *                 enum: [AGILE, WATERFALL, SCRUM]
 *     responses:
 *       200:
 *         description: Methodology updated
 */
// PATCH /projects/:id/methodology - Update project methodology (Admin only)
router.patch('/:id/methodology', authorize('ADMIN'), projectsController.updateMethodology);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted
 */
// DELETE /projects/:id - Delete a project (Admin only)
router.delete('/:id', authorize('ADMIN'), projectsController.deleteProject);

module.exports = router;
