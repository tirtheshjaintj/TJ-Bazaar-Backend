const Seller = require('../models/seller.model');
const { setUser } = require('../helpers/jwt.helper');
const asyncHandler = require('express-async-handler');
const sendMail = require('../helpers/mail.helper');
const crypto = require('crypto');
const Product = require('../models/product.model');
const Media = require('../models/media.model');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');

// Signup
const signup = async (req, res) => {
    const { name, email, phone_number, address, gst_number, password } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate OTP

    try {
        const existingSeller = await Seller.findOne({ email, verified: true });
        if (existingSeller) {
            return res.status(400).json({ status: false, message: 'Seller already exists with this email.' });
        }

        const existingSeller2 = await Seller.findOne({ phone_number, verified: true });
        if (existingSeller2) {
            return res.status(400).json({ status: false, message: 'Seller already exists with this phone number.' });
        }

        const existingSeller3 = await Seller.findOne({ gst_number, verified: true });
        if (existingSeller3) {
            return res.status(400).json({ status: false, message: 'Seller already exists with this GST number.' });
        }

        let seller;
        const newSeller = await Seller.findOne({ email, verified: false });

        if (!newSeller) {
            // Create new seller
            seller = await Seller.create({ name, email, phone_number, address, gst_number, password, otp });
        } else {
            // Update existing seller
            newSeller.name = name;
            newSeller.phone_number = phone_number;
            newSeller.address = address;
            newSeller.otp = otp; // Set OTP
            newSeller.password = password;
            newSeller.gst_number = gst_number;
            await newSeller.save();
            seller = newSeller;
        }

        const mailStatus = await sendMail('TJ Bazaar🛒: Your OTP Code', email, `Your OTP code is ${otp}`);
        if (mailStatus) {
            res.status(201).json({ status: true, message: 'Seller registered successfully! Please verify your email.', seller });
        } else {
            res.status(500).json({ status: false, message: 'Failed to send OTP.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

// Login
const login = async (req, res) => {
   

    const { email, password } = req.body;

    try {
        const seller = await Seller.findOne({ email, verified: true });
        if (!seller) {
            return res.status(400).json({ status: false, message: 'Invalid email or password.' });
        }

        const isMatch = await seller.isPasswordCorrect(password);
        if (!isMatch) {
            return res.status(400).json({ status: false, message: 'Invalid email or password.' });
        }
        const token = setUser(seller);
        const rec_email = seller.email;
        await sendMail('TJ Bazaar🛒: Logged In as Seller On new Device', rec_email,
            `TJ Bazaar🛒 Just wanted to let you know that your account has been loggedIn in a new device`);
        res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

// Update Seller Details
const updateSeller = async (req, res) => {
   

    const { name, phone_number, address, gst_number } = req.body;

    try {
        const sellerId = req.user.id;  // Assuming seller ID is extracted from a middleware
        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { name, phone_number, address, gst_number },
            { new: true, runValidators: true }
        );

        if (!seller) {
            return res.status(404).json({ status: false, message: 'Seller not found.' });
        }

        res.status(200).json({ status: true, message: 'Seller details updated successfully!', seller });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

// Verify OTP
const verifyOtp = async (req, res) => {
   

    const { otp } = req.body;
    const { sellerid } = req.params;

    try {
        const seller = await Seller.findOne({ _id: sellerid, otp, verified: false });
        if (!seller) {
            return res.status(400).json({ status: false, message: 'Invalid OTP or seller already verified.' });
        }

        await Seller.findByIdAndUpdate(seller._id, { verified: true, otp: null });
        const mailStatus = await sendMail('TJ Bazaar🛒: Account Verified Successfully ✅', seller.email, `Hello ${seller.name}, Congratulations 🎉 your account is now verified and you can start selling products.`);

        if (!mailStatus) {
            res.status(500).json({ status: false, message: 'Internal Server Error' });
        }
        const token = setUser(seller);
        res.status(200).json({ status: true, message: 'Seller verified successfully!', token });

    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};



// Resend OTP
const resendOtp = async (req, res) => {
    const { sellerid } = req.params;
   
    try {
        const seller = await Seller.findOne({ _id: sellerid, verified: false });
        if (!seller) {
            return res.status(400).json({ status: false, message: 'Seller not found or already verified.' });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        await Seller.findByIdAndUpdate(seller._id, { otp: newOtp });

        const mailStatus = await sendMail('TJ Bazaar🛒: Your new OTP Code', seller.email, `Your new OTP code is ${newOtp}`);

        if (mailStatus) {
            res.status(200).json({ status: true, message: 'New OTP sent successfully!' });
        } else {
            res.status(500).json({ status: false, message: 'Failed to send OTP.' });
        }

    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

const getProducts = async (req, res) => {
   

    try {
        const seller_id = req.user.id;
        // Fetch products for the seller and populate the category information
        const products = await Product.find({ seller_id }).lean();  // Convert MongoDB documents to plain JavaScript objects for easier manipulation

        // Fetch all media associated with these products
        const productIds = products.map(product => product._id);
        const media = await Media.find({ product_id: { $in: productIds } }).lean();
        // Map product IDs to their corresponding media URLs
        const mediaMap = media.reduce((acc, item) => {
            acc[item.product_id] = item.images;
            return acc;
        }, {});

        // Attach media to their respective products
        const productsWithMedia = products.map(product => ({
            ...product,
            media: mediaMap[product._id] || []  // Attach media if exists, else an empty array
        }));

        return res.status(200).json({
            status: true,
            message: 'Products Received successfully',
            data: productsWithMedia
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

const getOrders = asyncHandler(async (req, res) => {
    const seller_id = req.user.id;
    try {
        // Fetch all products for the seller
        const products = await Product.find({ seller_id }).select('_id');
        const productIds = products.map(product => product._id);

        if (productIds.length === 0) {
            return res.status(404).json({ status: false, message: 'No products found for this seller' });
        }

        // Fetch orders related to any of the seller's products
        const orders = await Order.find({ product_id: { $in: productIds },order_status:true})
            .populate({
                path: 'product_id',
                select: 'name price' // Only get required product fields
            })
            .populate({
                path: 'user_id',
                select: 'name address phone_number' // Only get user name and address
            });

        if (orders.length === 0) {
            return res.status(404).json({ status: false, message: 'No orders found for this seller\'s products' });
        }

        // Map through orders to include required details
        const orderDetails = await Promise.all(orders.map(async (order) => {
            const product = order.product_id;
            const payment = await Payment.findOne({ order_id: order._id }); // Get payment details for the order
            const media = await Media.findOne({ product_id: product._id });
            const image = media?.images[0]; // Get first image from media

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
                    image: image || null // Default to null if no image found
                },
                user: {
                    id: order.user_id._id,
                    name: order.user_id.name,
                    address: order.user_id.address,
                    phone_number: order.user_id.phone_number
                }
            };
        }));

        res.status(200).json({ status: true, message: 'Orders fetched successfully', data: orderDetails });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});



const getSeller = async (req, res) => {
    try {
        
        const sellerId = req.user.id;
        const seller = await Seller.findById(sellerId).select("-password -otp -__v -verified");;
        if (!seller) return res.status(500).json({ status: false, message: 'Seller Not Found' });
        return res.status(200).json({ status: true,message:"Seller Found",data:seller });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

const forgotPassword = async (req, res) => {
    try {
    const { email } = req.body;
    const seller = await Seller.findOne({ email, verified: true });
    if (!seller) return res.status(404).json({ status: false, message: 'No Account Exists' });

    const otp = crypto.randomInt(100000, 999999).toString(); // Generate OTP
    seller.otp = otp; // Save OTP in the user document
    await seller.save();

    const mailStatus = await sendMail('TJ Bazaar🛒: Your OTP Code to Reset Password', seller.email, `Your OTP code to Reset Password is ${otp}`);

    if (mailStatus) {
        res.status(200).json({ status: true, message: 'OTP Sent to your Email!' });
    } else {
        res.status(500).json({ status: false, message: 'Failed to send OTP.' });
    }           
} catch (error) {
    res.status(500).json({ status: false, message: 'Failed to send OTP.' });
}
};

const changePassword=async(req,res)=>{
    try {
    const {email,otp,password}=req.body;
    const seller=await Seller.findOne({email,otp,verified:true});
    if(!seller) return res.status(404).json({ status: false, message: 'OTP Not Correct' });
    seller.password = password;
    seller.otp=null;
    await seller.save();
    const mailStatus = await sendMail('TJ Bazaar🛒: Password Changed Successfully ✅', seller.email, `TJ Bazaar🛒: Password Changed Successfully ✅`);
    return res.status(200).json({ status: true, message:"Password updated successfully"}); 
} catch (error) {
    console.log(error);
    res.status(500).json({ status: false, message: 'Failed to verify OTP.' });   
}
};

module.exports = {
    signup,
    login,
    updateSeller,
    verifyOtp,
    resendOtp,
    getSeller,
    getProducts,
    getOrders,
    forgotPassword,
    changePassword
};