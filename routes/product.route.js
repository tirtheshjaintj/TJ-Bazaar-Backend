const { Router } = require('express');
const { check } = require('express-validator');
const { getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/product.controller');
const router = Router();
const { restrictLogIn } = require('../middlewares/authCheck');
const upload = require('../middlewares/multer');

// Get Product Details
router.get('/:id',
    check('id').isMongoId().withMessage('Invalid product ID'),
    getProduct
);

// Create New Product
router.post('/create', 
    upload.array('images'), // Handle multiple image uploads
    [
        check('category_id').isMongoId().withMessage('Category ID is required and must be a valid MongoDB ObjectId'),
        check('seller_id').isMongoId().withMessage('Seller ID is required and must be a valid MongoDB ObjectId'),
        check('name').notEmpty().withMessage('Product name is required')
            .matches(/^[a-zA-Z0-9\s]{3,100}$/).withMessage('Product name must be 3 to 100 characters long and can only include letters, numbers, and spaces'),
        check('description').notEmpty().withMessage('Product description is required')
            .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
        check('tags').isArray({ min: 1 }).withMessage('Tags must be an array with at least one tag'),
        check('price').isFloat({ gt: 10 }).withMessage('Price must be a number greater than 10'),
        check('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
    ], 
    restrictLogIn, 
    createProduct
);

// Update Product
router.put('/update/:id', 
    upload.array('images'), // Handle multiple image uploads
    [
        check('id').isMongoId().withMessage('Invalid product ID'),
        check('category_id').optional().isMongoId().withMessage('Category ID must be a valid MongoDB ObjectId'),
        check('seller_id').optional().isMongoId().withMessage('Seller ID must be a valid MongoDB ObjectId'),
        check('name').optional().matches(/^[a-zA-Z0-9\s]{3,100}$/).withMessage('Product name must be 3 to 100 characters long and can only include letters, numbers, and spaces'),
        check('description').optional().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
        check('tags').optional().isArray({ min: 1 }).withMessage('Tags must be an array with at least one tag'),
        check('price').optional().isFloat({ gt: 10 }).withMessage('Price must be a number greater than 10'),
        check('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
    ], 
    restrictLogIn, 
    updateProduct
);

// Delete Product
router.delete('/delete/:id', 
    check('id').isMongoId().withMessage('Invalid product ID'),
    restrictLogIn, 
    deleteProduct
);

module.exports = router;
