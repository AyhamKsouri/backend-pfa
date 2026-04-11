const { body, param, validationResult } = require('express-validator');

const validateUpdateProgress = [
  param('id').isInt({ min: 1 }).withMessage('Task ID must be a positive integer'),

  body('progress')
    .exists({ checkFalsy: true }).withMessage('Progress is required')
    .isInt({ min: 0, max: 100 }).withMessage('Progress must be an integer between 0 and 100'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateUpdateProgress };
