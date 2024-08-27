const mongoose = require('mongoose');
const User = require('./user.model');
const Product = require('./product.model');

const cartSchema = new mongoose.Schema({
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
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        validate: [
            {
                validator: function (v) {
                    return Number.isInteger(v) && v >= 0;
                },
                message: props => `Quantity must be a positive integer.`
            }
        ]
    }
}, { timestamps: true });

cartSchema.pre('save', async function (next) {
    try {
        const userExists = await User.findById(this.user_id);
        if (!userExists) {
            return next(new Error('Invalid user reference'));
        }
        const productExists = await Product.findById(this.product_id);
        if (!productExists) {
            return next(new Error('Product Not Available'));
        }
        if (productExists.quantity < this.quantity) {
            return next(new Error('Out Of Stock'));
        }
        next();
    } catch (error) {
        next(error);
    }
});

const cart = mongoose.model('cart', cartSchema);
module.exports = cart;