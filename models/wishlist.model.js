const mongoose = require('mongoose');
const User = require('./user.model');
const Product = require('./product.model');

const wishlistSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Product ID is required'],
        ref: 'Product'
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'User ID is required'],
        ref: 'User'
    }
}, { timestamps: true });

wishlistSchema.pre('save', async function (next) {
    try {
        const userExists = await User.findById(this.user_id);
        if (!userExists) {
            return next(new Error('Invalid user reference'));
        }
        const productExists = await Product.findById(this.product_id);
        if (!productExists) {
            return next(new Error('Product Not Available'));
        }
        next();
    } catch (error) {
        next(error);
    }
},{timestamps:true});


const wishlist = mongoose.model('wishlist', wishlistSchema);
module.exports = wishlist;