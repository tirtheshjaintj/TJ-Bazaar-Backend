const mongoose =require('mongoose');
const User =require('./user.model');
const Order=require('./order.model');
const { Schema, model } = mongoose;

const paymentSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    required: [true, 'Order ID is required'],
    ref: 'Order'
  },
  razorpay_order_id: {
    type: String,
    required: [true, 'Razorpay ID is required'],
    unique: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    validate: {
      validator: function (v) {
        // Ensure the amount is greater than zero
        return v > 0;
      },
      message: 'Amount must be greater than zero.'
    }
  },
  paymentStatus: {
    type: Boolean,
    default: false,
    required: true
  }
}, { timestamps: true });

// Pre-save hook to validate order and user references
paymentSchema.pre('save', async function (next) {
  try {
    // Validate User reference
    const userExists = await User.findById(this.user_id);
    if (!userExists) {
      return next(new Error('Invalid user reference'));
    }

    // Validate Order reference
    const orderExists = await Order.findById(this.order_id);
    if (!orderExists) {
      return next(new Error('Invalid order reference'));
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Compile the model
const Payment = model('Payment', paymentSchema);

module.exports= Payment;
