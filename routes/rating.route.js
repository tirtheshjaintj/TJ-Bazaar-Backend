const { Router } = require("express");
const { addReview, updateReview, deleteReview, getReviews } = require("../controllers/rating.controller");
const { restrictLogIn } = require("../middlewares/authCheck");
const { check} = require('express-validator');
const { validate } = require("../middlewares/validate");
const router = Router();

// Validation rules
const reviewValidations = [
  check('product_id').isMongoId().withMessage('Invalid Product ID'),
  check('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  check('review').optional().isString().withMessage('Review must be a string')
];


// Add a new review
router.post('/add', restrictLogIn, reviewValidations, validate, addReview);

// Update an existing review
router.put('/update/:id', restrictLogIn, reviewValidations, validate, updateReview);

//Get Reviews
router.get("/:id",getReviews);

// Delete a review
router.delete('/delete/:id', restrictLogIn, deleteReview);

module.exports = router;
