const expressAsyncHandler = require("express-async-handler");
const Rating = require("../models/rating.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");

// Add a review
const addReview = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const { product_id, rating, review } = req.body;

        // Check if product exists
        const product = await Product.findById(product_id);
        if (!product) return res.status(404).json({ status: false, message: 'Product Not Found' });

        // Check if user has already reviewed the product
        const existingReview = await Rating.findOne({ user_id, product_id });

        if (existingReview) {
            // Update the existing review
            existingReview.rating = rating;
            existingReview.review = review;
            await existingReview.save();
            return res.status(200).json({ status: true, message: 'Review updated successfully', data: existingReview });
        }

        // Create new rating and review
        const newRating = await Rating.create({ user_id, product_id, rating, review });
        if (!newRating) return res.status(500).json({ status: false, message: 'Failed to add review' });

        res.status(200).json({ status: true, message: 'Review added successfully', data: newRating });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});



// Update a review
const updateReview = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const review_id = req.params.id;
        const { rating, review } = req.body;

        // Find the review by the user
        const existingReview = await Rating.findOne({ _id: review_id, user_id });
        if (!existingReview) return res.status(404).json({ status: false, message: 'Review not found' });

        // Update the rating and review
        existingReview.rating = rating;
        existingReview.review = review;

        const updatedReview = await existingReview.save();
        res.status(200).json({ status: true, message: 'Review updated successfully', data: updatedReview });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

// Delete a review
const deleteReview = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const review_id = req.params.id;

        // Find and delete the review
        const deletedReview = await Rating.findOneAndDelete({ _id: review_id, user_id });
        if (!deletedReview) return res.status(404).json({ status: false, message: 'Review not found' });

        res.status(200).json({ status: true, message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

//Get reviews for product id
const getReviews=expressAsyncHandler(async (req,res)=>{
const product_id=req.params.id;
const product = await Product.findById(product_id);
if (!product) return res.status(404).json({ status: false, message: 'Product Not Found' });
const reviews=await Rating.find({product_id});

return res.status(200).json({ status: true, message: 'Ratings Fetched',data:reviews});
});;

module.exports = {
    addReview,
    updateReview,
    deleteReview,
    getReviews
};
