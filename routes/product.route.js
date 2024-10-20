const { Router } = require('express');
const { check } = require('express-validator');
const { getProduct, createProduct, updateProduct, deleteProduct, getCategories, removeImage, getProducts,searchProducts, getProductsByCategory, getProductsBySeller, searchProductSuggestions} = require('../controllers/product.controller');
const router = Router();
const { restrictLogIn } = require('../middlewares/authCheck');
const upload = require('../middlewares/multer');
const category = require('../models/category.model');
const { validate } = require('../middlewares/validate');

// Get Product Details
router.get('/:id',
    check('id').isMongoId().withMessage('Invalid product ID'),
    validate,
    getProduct
);

router.get("/get/products",getProducts);


router.post("/search",
check('keyword').not().isEmpty().withMessage('Invalid keyword'),
validate
,searchProducts);

router.post("/suggest",
    check('keyword').not().isEmpty().withMessage('Invalid keyword'),
    validate
,searchProductSuggestions);

// Create New Product
router.post('/create', 
    upload.array('images'), // Handle multiple image uploads
    (req,res,next)=>{
        req.body.tags=JSON.parse(req.body.tags);
        next();
     },
    [
        check('category_id').isMongoId().withMessage('Category ID is required and must be a valid MongoDB ObjectId'),
        check('name').notEmpty().withMessage('Product name is required')
            .matches(/^[a-zA-Z0-9\s]{3,100}$/).withMessage('Product name must be 3 to 100 characters long and can only include letters, numbers, and spaces'),
        check('description').notEmpty().withMessage('Product description is required')
            .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
        // check('tags').isArray({ min: 1 }).withMessage('Tags must be an array with at least one tag'),
        check('price').isFloat({ gt: 10 ,lt:1000001}).withMessage('Price must be a number greater than 10 and less than 1 lakh'),
        check('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
        check('tags').optional().isArray({ min: 1 }).withMessage('Tags must be an array with at least one tag')
    ], 
    restrictLogIn, 
    validate,
    createProduct
);

// Update Product
// Update product route with image upload
router.put('/update/:id',
    upload.array('images'), // Handle multiple image uploads
    (req,res,next)=>{
       req.body.tags=JSON.parse(req.body.tags);
       next();
    },
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
    validate,
    updateProduct
);

// Remove image route
router.delete('/removeimg/:id',
    restrictLogIn,
    [
        check('product_id').isMongoId().withMessage('Product ID is required and must be a valid MongoDB ObjectId'),
        check('image_url').isURL().withMessage('Image URL is required and must be a valid URL')
    ],
    validate,
    removeImage
);

// Delete Product
router.delete('/delete/:id', 
    check('id').isMongoId().withMessage('Invalid product ID'),
    restrictLogIn, 
    validate,
    deleteProduct
);

router.get('/get/categories',getCategories);

// router.post('/categories',async (req,res)=>{
//     try {
//         const {name}=req.body;
//         const newCategory=await category.create({
//             name
//         });
//         res.status(200).json({category:newCategory});
//     } catch (error) {
//         res.status(500).json({message:error.message});
//     }
// });

// Fetch Products by Category ID
router.get('/category/:category_id',
    check('category_id').isMongoId().withMessage('Invalid category ID'),
    validate,
    getProductsByCategory
);

// Fetch Products by Seller ID
router.get('/seller/:seller_id',
    check('seller_id').isMongoId().withMessage('Invalid seller ID'),
    validate,
    getProductsBySeller
);


module.exports = router;
