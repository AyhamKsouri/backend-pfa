const { body, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const registrationValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .escape(),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
    .escape(),
  handleValidationErrors,
];

/**
 * Validation rules for user update
 */
const userUpdateValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('firstName')
    .optional()
    .trim()
    .escape(),
  body('lastName')
    .optional()
    .trim()
    .escape(),
  body('role')
    .optional()
    .isIn(['ADMIN', 'MEMBER'])
    .withMessage('Invalid role value'),
  handleValidationErrors,
];

/**
 * Validation rules for task status update
 */
const taskStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['TODO', 'IN_PROGRESS', 'DONE'])
    .withMessage('Invalid task status. Must be TODO, IN_PROGRESS, or DONE'),
  handleValidationErrors,
];

/**
 * Validation rules for comment creation
 */
const commentValidation = [
  body('text')
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: 1 })
    .withMessage('Comment cannot be empty')
    .trim(),
  handleValidationErrors,
];

/**
 * Validation rules for project creation
 */
const projectCreationValidation = [
  body('name')
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 3 })
    .withMessage('Project name must be at least 3 characters long')
    .trim(),
  body('methodology')
    .notEmpty()
    .withMessage('Methodology is required')
    .isIn(['AGILE', 'WATERFALL', 'KANBAN'])
    .withMessage('Invalid methodology. Must be AGILE, WATERFALL, or KANBAN'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'ARCHIVED'])
    .withMessage('Invalid status value'),
  body('complexity')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Invalid complexity value'),
  body('durationMonths')
    .notEmpty()
    .withMessage('Duration in months is required')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  handleValidationErrors,
];

/**
 * Validation rules for project ID in query params
 */
const projectIdQueryValidation = [
  query('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer'),
  handleValidationErrors,
];

module.exports = {
  registrationValidation,
  userUpdateValidation,
  taskStatusValidation,
  commentValidation,
  projectCreationValidation,
  projectIdQueryValidation,
};
