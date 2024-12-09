const asyncHandler = require('express-async-handler');
const Payment = require('../models/payment.model.js');
const User = require('../models/user.model.js');
const Order = require('../models/order.model.js');
const Product = require('../models/product.model.js');
const { createOrder, verifyPayment } = require('../helpers/razor.helper.js');
const Media = require('../models/media.model.js');
const Cart = require('../models/cart.model.js');

const createOrderController = asyncHandler(async (req, res) => {

    const user_id = req.user.id;
    const { product_id, quantity } = req.body;

    try {
        // Validate input
        if (!product_id || !quantity) {
            return res.status(400).json({ status: false, message: 'Product ID and quantity are required' });
        }

        // Find the user
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        // Validate the product and quantity
        const product = await Product.findById(product_id);
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
            product_id: product_id,
            user_id: user_id,
            quantity,
            order_status: false
        });

        // Create a Payment record
        const payment = await Payment.create({
            razorpay_order_id: paymentInit.id,
            amount,
            user_id: user_id,
            order_id: order._id
        });

        res.status(201).json({ status: true, message: 'Order created successfully', paymentInit });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

const mongoose = require('mongoose'); // For transactions

const verifyOrderController = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ status: false, message: 'Order ID, Payment ID, and Signature are required' });
        }

        const payment = await Payment.findOne({ razorpay_order_id });
        if (!payment) {
            return res.status(404).json({ status: false, message: 'Payment record not found' });
        }

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

        if (!isValid) {
            return res.status(400).json({ status: false, message: 'Payment verification failed' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Update payment status
            payment.paymentStatus = true;
            await payment.save({ session });

            const order = await Order.findById(payment.order_id).session(session);
            if (!order) {
                throw new Error('Order not found');
            }

            const product = await Product.findById(order.product_id).session(session);
            if (!product) {
                throw new Error('Product not found');
            }

            if (product.quantity < order.quantity) {
                throw new Error('Not enough stock to fulfill the order');
            }

            // Reduce product quantity and save
            product.quantity -= order.quantity;
            await product.save({ session });

            // Update order status
            order.order_status = true;
            await order.save({ session });

            // Remove from cart
            await Cart.findOneAndDelete({ user_id: order.user_id, product_id: order.product_id }).session(session);

            await session.commitTransaction();
            session.endSession();

            res.status(200).json({
                status: true,
                message: 'Payment verified, product quantity updated, and order status updated successfully',
            });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});



const getOrders = asyncHandler(async (req, res) => {
    const user_id = req.user.id;

    try {
        // Find the user
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        // Fetch orders with populated product details and payment records
        const orders = await Order.find({ user_id })
            .populate({
                path: 'product_id',
                select: '-description'
            });

        // Map through orders to include required details
        const orderDetails = await Promise.all(orders.map(async (order) => {
            const product = order.product_id;
            const payment = await Payment.findOne({ order_id: order._id }); // Get payment details for the order
            const media = await Media.findOne({ product_id: product._id });
            const image = media?.images[0];
            return {
                order_id: order._id,
                quantity: order.quantity,
                createdAt: order.createdAt,
                order_status: order.order_status,
                amount: payment ? payment.amount : 0,
                product: {
                    id: product._id,
                    name: product.name,
                    price: payment.amount / order.quantity,
                    image
                },
            };
        }));

        res.status(200).json({ status: true, message: 'Orders fetched successfully', data: orderDetails });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});




module.exports = { createOrderController, verifyOrderController, getOrders };
