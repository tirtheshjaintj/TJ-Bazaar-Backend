const express = require('express');
const { check } = require('express-validator');
const { restrictLogIn } = require('../middlewares/authCheck');
const {
    signup,
    login,
    updateUser,
    verifyOtp,
    resendOtp,
    getUser,
    changePassword,
    forgotPassword,
    google_login
} = require('../controllers/user.controller');
const { validate } = require('../middlewares/validate');

const router = express.Router();

router.get('/getUser', restrictLogIn, validate, getUser);

router.post('/signup',
    [
        check('name').matches(/^[a-zA-Z\s]+$/).isLength({ min: 3 }).withMessage('Name must contain only letters and spaces.'),
        check('email').isEmail().withMessage('Please enter a valid email address.'),
        check('phone_number').matches(/^[0-9]{10}$/).withMessage('Phone number must contain exactly 10 digits.'),
        check('address').isLength({ min: 10 }).withMessage('Address must be at least 10 characters long.'),
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    ],
    validate,
    signup
);

router.post('/login',
    [
        check('email').isEmail().withMessage('Please enter a valid email address.'),
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    ],
    validate,
    login
);

router.put('/update',
    restrictLogIn,
    [
        check('name').optional().matches(/^[a-zA-Z\s]+$/).withMessage('Name must contain only letters and spaces.'),
        check('email').optional().isEmail().withMessage('Please enter a valid email address.'),
        check('phone_number').optional().matches(/^[0-9]{10}$/).withMessage('Phone number must contain exactly 10 digits.'),
        check('address').optional().isLength({ min: 10 }).withMessage('Address must be at least 10 characters long.')
    ],
    validate,
    updateUser
);

router.post('/verify-otp/:userid',
    [
        check('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
        check('userid').isMongoId().withMessage('Invalid User ID.')
    ],
    validate,
    verifyOtp
);

router.post('/resend-otp/:userid',
    check('userid').isMongoId().withMessage('Invalid User ID.'),
    validate,
    resendOtp
);

router.post('/forgot-password',
    check('email').isEmail().withMessage('Please enter your valid email address'),
    validate,
    forgotPassword
)

router.post('/change-password',
    check('email').isEmail().withMessage('Please enter your valid email address'),
    check('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
    check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
    validate,
    changePassword
);

router.post('/google_login', [
    check("token").isJWT().withMessage("Not Valid JWT")
], validate, google_login);

module.exports = router;
