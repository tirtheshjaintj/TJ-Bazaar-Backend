const { Router } = require("express");
const { restrictLogIn } = require('../middlewares/authCheck');
const { check, validationResult } = require('express-validator');
const { addToWishlist, removeFromWishlist, getWishlist, checkInWishlist, getWishlistItemCount } = require('../controllers/wishlist.controller');
const { validate } = require("../middlewares/validate");
const router = Router();

// Validation rules
const addToWishlistValidations = [
    check('product_id').isMongoId().withMessage('Invalid Product ID')
];

const removeFromWishlistValidations = [
    check('id').isMongoId().withMessage('Invalid Wishlist ID')
];

const checkInWishlistValidations = [
    check('product_id').isMongoId().withMessage('Invalid Product ID')
];



// Routes
router.post("/add", restrictLogIn, addToWishlistValidations, validate, addToWishlist);
router.delete("/remove/:id", restrictLogIn, removeFromWishlistValidations, validate, removeFromWishlist);
router.get("/", restrictLogIn, getWishlist);
router.get("/check/:product_id", restrictLogIn, checkInWishlistValidations, validate, checkInWishlist);
router.get("/count", restrictLogIn, getWishlistItemCount);

module.exports = router;