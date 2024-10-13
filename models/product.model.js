const mongoose = require('mongoose');
const Category = require('./category.model');
const Seller = require('./seller.model');

// Define the schema
const productSchema = new mongoose.Schema({
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Category is required'],
    ref: 'category'
  },
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Seller is required'],
    ref: 'Seller'
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    validate: {
      validator: function (v) {
        // Regular expression for product name validation
        // Allows letters, numbers, spaces, and is 3 to 100 characters long
        return /^[a-zA-Z0-9\s]{3,100}$/.test(v);
      },
      message: props => `${props.value} is not a valid product name! It should be 3 to 100 characters long and may include letters, numbers, and spaces.`
    }
  },
  description: {
    type: String,
    required: [true, 'Product Description is required'],
  },
  tags:{
    type: [String],
    required: [true, 'Product Tags is required']
  }
,
  price: {
    type: Number,
    required: [true, 'Price is required'],
    validate: {
      validator: function (v) {
        return Number.isInteger(v) && v > 10;
      },
      message: props => `${props.value} is not a valid price! It should be a positive number greater than 10.`
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    validate: [
      {
        validator: function (v) {
          // Ensure quantity is a positive integer
          return Number.isInteger(v) && v >= 0;
        },
        message: props => `Quantity must be a positive integer.`
      }
    ]
  },

},{timestamps: true});

// Pre-save hook to validate category and seller references
productSchema.pre('save', async function (next) {
  try {
    // Validate Category reference
    const categoryExists = await Category.findById(this.category_id);
    if (!categoryExists) {
      return next(new Error('Invalid category reference'));
    }
    // Validate Seller reference
    const sellerExists = await Seller.findById(this.seller_id);
    if (!sellerExists) {
      return next(new Error('Invalid seller reference'));
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Compile the model
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
