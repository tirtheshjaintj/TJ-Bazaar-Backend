const express = require('express');
const { check } = require('express-validator');
const {
    signup,
    login,
    updateSeller,
    verifyOtp,
    resendOtp,
    getSeller,
    getProducts
} = require('../controllers/seller.controller');

const { restrictLogIn } = require('../middlewares/authCheck');
const router = express.Router();

//Seller
router.get('/getSeller',restrictLogIn, getSeller);

//Get Products Listed By User
router.get('/getProducts',
    restrictLogIn,
    getProducts);

// Signup Route
router.post('/signup',
    [
        check('name').matches(/^[a-zA-Z\s]+$/).isLength({ min: 3 }).withMessage('Name must contain only letters and spaces.'),
        check('email').isEmail().withMessage('Please enter a valid email address.'),
        check('phone_number').matches(/^[0-9]{10}$/).withMessage('Phone number must contain exactly 10 digits.'),
        check('address').isLength({ min: 10 }).withMessage('Address must be at least 10 characters long.'),
        check('gst_number').matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST number format.'),
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    ],
    signup
);

// Login Route
router.post('/login',
    [
        check('email').isEmail().withMessage('Please enter a valid email address.'),
    ],
    login
);

// Update Seller Details Route
router.put('/update',
    restrictLogIn,
    [
        check('name').optional().matches(/^[a-zA-Z\s]+$/).withMessage('Name must contain only letters and spaces.'),
        check('phone_number').optional().matches(/^[0-9]{10}$/).withMessage('Phone number must contain exactly 10 digits.'),
        check('address').optional().isLength({ min: 10 }).withMessage('Address must be at least 10 characters long.'),
        check('gst_number').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST number format.')
    ],
    updateSeller
);



// Verify OTP Route
router.post('/verify-otp/:sellerid',
    [
        check('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
        check('sellerid').isMongoId().withMessage('Invalid User ID.')
    ],
    verifyOtp
);

// Resend OTP Route
router.post('/resend-otp/:sellerid',
    check('sellerid').isMongoId().withMessage('Invalid User ID.')
    , resendOtp);

module.exports = router;
