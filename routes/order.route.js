const { Router } = require('express');
const { check, validationResult} = require('express-validator');
const router = Router();
// Import controllers
const { createOrderController, verifyOrderController,getOrders } = require('../controllers/order.controller.js');
const { restrictLogIn } = require('../middlewares/authCheck.js');

// Validation middleware for creating an order  
const createOrderValidations = [
    check('product_id').isMongoId().withMessage('Invalid Product ID'),
    check('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
];

// Validation middleware for verifying an order
const verifyOrderValidations = [
    check('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
    check('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
    check('razorpay_signature').notEmpty().withMessage('Signature is required'),
];

// Middleware to check validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0].msg });
    }
    next();
};

// Route to create an order with validation
router.post('/create_order',restrictLogIn, createOrderValidations, validate, createOrderController);

// Route to verify an order with validation
router.post('/verify_order',restrictLogIn, verifyOrderValidations, validate, verifyOrderController);

router.get('/get_orders',restrictLogIn,getOrders);

module.exports = router;
