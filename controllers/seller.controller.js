const { validationResult } = require('express-validator');
const Seller = require('../models/seller.model');
const { setUser } = require('../helpers/jwt.helper');
const sendMail = require('../helpers/mail.helper');
const crypto = require('crypto');
const Product = require('../models/product.model');
const Media = require('../models/media.model');

// Signup
const signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0].msg });
    }

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0].msg });
    }

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0].msg });
    }

    const { name, phone_number, address, gst_number } = req.body;

    try {
        const sellerId = req.user.id;  // Assuming user ID is extracted from a middleware
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0].msg });
    }

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0].sg });
    }
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0].msg });
    }

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


const getSeller = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: false, message: errors.array()[0].msg });
        }
        const sellerId = req.user.id;
        const seller = await Seller.findById(sellerId).select("-password -otp -__v -verified");;
        if (!seller) return res.status(500).json({ status: false, message: 'Seller Not Found' });
        return res.status(200).json({ status: true,message:"Seller Found",data:seller });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

module.exports = {
    signup,
    login,
    updateSeller,
    verifyOtp,
    resendOtp,
    getSeller,
    getProducts
};