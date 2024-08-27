const asyncHandler = require('express-async-handler');
const Payment = require('../models/payment.model.js');
const User = require('../models/user.model.js');
const Order = require('../models/order.model.js');
const Product = require('../models/product.model.js');
const { createOrder, verifyPayment } = require('../helpers/razor.helper.js');

const createOrderController = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { productId, quantity } = req.body;
    try {
        // Validate input
        if (!productId || !quantity) {
            return res.status(400).json({ status: false, message: 'Product ID and quantity are required' });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        // Validate the product and quantity
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        if (product.quantity < quantity) {
            return res.status(400).json({ status: false, message: 'Not enough stock' });
        }

        // Calculate the amount
        const amount = product.price * quantity;

        // Create the Razorpay order
        const paymentInit = await createOrder(amount);

        // Create an Order in the database
        const order = await Order.create({
            product_id: productId,
            user_id: userId,
            quantity,
            order_status: false
        });

        // Create a Payment record
        const payment = await Payment.create({
            razorpay_order_id: paymentInit.id,
            amount,
            user_id: userId,
            order_id: order._id
        });

        res.status(201).json({ status: true, message: 'Order created successfully', paymentInit });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

const verifyOrderController = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ status: false, message: 'Order ID, Payment ID, and Signature are required' });
        }

        // Find the payment record
        const payment = await Payment.findOne({ razorpay_order_id });
        if (!payment) {
            return res.status(404).json({ status: false, message: 'Payment record not found' });
        }

        // Validate the payment signature
        const secret = process.env.RAZORPAY_API_SECRET;

        if (!secret) {
            return res.status(500).json({ status: false, message: 'Razorpay secret not found' });
        }

        const isValid = verifyPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            secret
        );

        if (isValid) {
            // Update the payment status
            payment.paymentStatus = true;
            await payment.save();

            // Update the order status to paid
            const order = await Order.findById(payment.order_id);
            if (!order) {
                return res.status(404).json({ status: false, message: 'Order not found' });
            }

            order.order_status = true;
            await order.save();
            res.status(200).json({ status: true, message: 'Payment verified and order status updated successfully' });

        } else {
            
            res.status(400).json({ status: false, message: 'Payment verification failed' });

        }
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

module.exports = { createOrderController, verifyOrderController };
