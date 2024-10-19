const { restrictLogIn } = require('../middlewares/authCheck');
const { Router } = require('express');
const { check} = require('express-validator');
const { addToCart, removeFromCart, getCart,getCheckCart, getCartItemCount} = require('../controllers/cart.controller');
const { validate } = require('../middlewares/validate');

const router=Router();

const addToCartValidations = [
    check('product_id').isMongoId().withMessage('Invalid Product ID'),
    check('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
];

const removeFromCartValidations = [
    check('id').isMongoId().withMessage('Invalid Cart ID')
];
const checkInCartValidations = [
    check('id').isMongoId().withMessage('Invalid Product ID'),
];



router.post("/add",restrictLogIn,addToCartValidations,validate,addToCart);
router.delete("/remove/:id",restrictLogIn,removeFromCartValidations,validate,removeFromCart);
router.get("/",restrictLogIn,getCart);
router.get("/check_cart/:id",restrictLogIn,checkInCartValidations,getCheckCart);
router.get("/count",restrictLogIn,getCartItemCount);

module.exports = router;