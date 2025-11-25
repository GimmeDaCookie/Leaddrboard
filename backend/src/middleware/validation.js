const { body, param, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Username validation
const validateUsername = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores')
    .escape(),
  validateRequest
];

// Password validation
const validatePassword = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  validateRequest
];

// Score validation
const validateScore = [
  body('rawScore')
    .isInt({ min: 0, max: 1000000 })
    .withMessage('Score must be between 0 and 1,000,000'),
  body('difficultyName')
    .isIn(['Beginner', 'Basic', 'Difficult', 'Expert', 'Challenge'])
    .withMessage('Invalid difficulty'),
  validateRequest
];

// Profile picture URL validation
const validateProfilePicture = [
  body('profilePicture')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Invalid URL format')
    .isLength({ max: 500 })
    .withMessage('URL too long'),
  validateRequest
];

module.exports = {
  validateUsername,
  validatePassword,
  validateScore,
  validateProfilePicture,
  validateRequest
};
