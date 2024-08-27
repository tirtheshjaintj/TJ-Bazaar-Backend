const { validationResult } = require('express-validator');
const Seller = require('../models/seller.model');
const { setUser } = require('../helpers/jwt.helper');
const sendMail = require('../helpers/mail.helper');
const crypto = require('crypto');

// Signup
const signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }

    const { name, email, phone_number, address, gst_number, password } = req.body;

    try {
        const existingSeller = await Seller.findOne({ email });
        if (existingSeller) {
            return res.status(400).json({ status: false, error: 'Seller already exists with this email.' });
        }

        const existingSeller2 = await Seller.findOne({ phone_number });
        if (existingSeller2) {
            return res.status(400).json({ status: false, error: 'Seller already exists with this phone number.' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const mailStatus = await sendMail('Your OTP Code', email, `Your OTP code is ${otp}`);

        const seller = await Seller.create({ name, email, phone_number, address, gst_number, password, otp });

        if (mailStatus) {
            res.status(201).json({ status: true, message: 'Seller registered successfully! Please verify your email.', seller });
        } else {
            res.status(500).json({ status: false, error: 'Failed to send OTP.' });
        }
    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

// Login
const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }

    const { email, password } = req.body;

    try {
        const seller = await Seller.findOne({ email, verified: true });
        if (!seller) {
            return res.status(400).json({ status: false, error: 'Invalid email or password.' });
        }

        const isMatch = await seller.isPasswordCorrect(password);
        if (!isMatch) {
            return res.status(400).json({ status: false, error: 'Invalid email or password.' });
        }

        const token = setUser(seller);
        res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

// Update Seller Details
const updateSeller = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }

    const { name, email, phone_number, address, gst_number } = req.body;

    try {
        const sellerId = req.user._id;  // Assuming user ID is extracted from a middleware

        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { name, email, phone_number, address, gst_number },
            { new: true, runValidators: true }
        );

        if (!seller) {
            return res.status(404).json({ status: false, error: 'Seller not found.' });
        }

        res.status(200).json({ status: true, message: 'Seller details updated successfully!', seller });
    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

// Verify OTP
const verifyOtp = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }
    
    const { otp } = req.body;
    const { sellerid } = req.params;

    try {
        const seller = await Seller.findOne({ _id: sellerid, otp, verified: false });
        if (!seller) {
            return res.status(400).json({ status: false, error: 'Invalid OTP or seller already verified.' });
        }

        await Seller.findByIdAndUpdate(seller._id, { verified: true, otp: null });
        const mailStatus = await sendMail('Account Verified Successfully ✅', seller.email, `Hello ${seller.name}, Congratulations 🎉 your account is now verified and you can start selling products.`);
        
        if (!mailStatus) {
            res.status(500).json({ status: false, error: 'Internal Server Error' });
        }

        res.status(200).json({ status: true, message: 'Seller verified successfully!' });

    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

// Resend OTP
const resendOtp = async (req, res) => {
    const { sellerid } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }
    try {
        const seller = await Seller.findOne({ _id: sellerid, verified: false });
        if (!seller) {
            return res.status(400).json({ status: false, error: 'Seller not found or already verified.' });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        await Seller.findByIdAndUpdate(seller._id, { otp: newOtp });

        const mailStatus = await sendMail('Your new OTP Code', seller.email, `Your new OTP code is ${newOtp}`);

        if (mailStatus) {
            res.status(200).json({ status: true, message: 'New OTP sent successfully!' });
        } else {
            res.status(500).json({ status: false, error: 'Failed to send OTP.' });
        }

    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

const getSeller =async (req, res) => {
    try {
       
       const userId = req.user._id;
       const user = await Seller.findById(userId);
       if(!user) res.status(500).json({ status: false, error: 'User Not Found' });
       return res.status(200).json({ status:true, user });
   
    } catch (error) {
       res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
   };
   
   module.exports = {
       signup,
       login,
       updateSeller,
       verifyOtp,
       resendOtp,
       getSeller
   };