const mongoose = require('mongoose');
const User = require('./user.model');
const Product = require('./product.model');

const ratingSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  rating: {
    type: Number,
    required: [true, 'Rate the Product'],
  },
  review: String
}, { timestamps: true });

// Pre-save hook to validate product, user references, and unique rating
ratingSchema.pre('save', async function (next) {
  try {
    // Validate User reference
    const userExists = await User.findById(this.user_id);
    if (!userExists) {
      return next(new Error('Invalid user reference'));
    }

    // Validate Product reference
    const productExists = await Product.findById(this.product_id);
    if (!productExists) {
      return next(new Error('Product Not Available'));
    }

    // Check if the user has already rated this product
    const existingRating = await mongoose.model('Rating').findOne({
      user_id: this.user_id,
      product_id: this.product_id
    });

    if (existingRating) {
      return next(new Error('You have already rated this product.'));
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;
