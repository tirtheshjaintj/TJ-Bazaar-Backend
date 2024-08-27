const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const { setUser } = require('../helpers/jwt.helper');
const sendMail = require('../helpers/mail.helper');
const crypto = require('crypto');

const signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }

    const { name, email, phone_number, address, password } = req.body;

    try {
        const existingUser = await User.findOne({ email, verified: true });
        if (existingUser) {
            return res.status(400).json({ status: false, error: 'User already exists with this email.' });
        }

        const existingUser2 = await User.findOne({ phone_number, verified: true});
        if (existingUser2) {
            return res.status(400).json({ status: false, error: 'User already exists with this phone number.' });
        }

        const unverifiedUser = await User.findOne({ email, verified: false });
        if (unverifiedUser) {
            const newOtp = crypto.randomInt(100000, 999999).toString();
            await User.findByIdAndUpdate(unverifiedUser._id, { otp: newOtp });
            const mailStatus = await sendMail('Your new OTP Code', email, `Your new OTP code is ${newOtp}`);
            if (mailStatus) {
                return res.status(200).json({ status: true, message: 'New OTP sent successfully!' });
            } else {
                return res.status(500).json({ status: false, error: 'Failed to send OTP.' });
            }
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const mailStatus = await sendMail('Your OTP Code', email, `Your OTP code is ${otp}`);
        const user = await User.create({ name, email, phone_number, address, password, otp });

        res.status(201).json({ status: true, message: 'Verification is Needed!', user });

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, verified: true });
        if (!user) {
            return res.status(400).json({ status: false, error: 'Invalid email or password.' });
        }

        const isMatch = await user.isPasswordCorrect(password);
        if (!isMatch) {
            return res.status(400).json({ status: false, error: 'Invalid email or password.' });
        }

        const token = setUser(user);
        res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

const updateUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }

    const { name, email, phone_number, address } = req.body;

    try {
        const userId = req.user._id; // Assuming user ID is extracted from a middleware

        const user = await User.findByIdAndUpdate(
            userId,
            { name, email, phone_number, address },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ status: false, error: 'User not found.' });
        }

        res.status(200).json({ status: true, message: 'User details updated successfully!', user });
    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

const verifyOtp = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }

    const { otp } = req.body;
    const { userid } = req.params;

    try {
        const user = await User.findOne({ _id: userid, otp, verified: false });
        if (!user) {
            return res.status(400).json({ status: false, error: 'Invalid OTP or user already verified.' });
        }

        await User.findByIdAndUpdate(user._id, { verified: true, otp: null });
        const mailStatus = await sendMail('Account Verified Successfully ✅', user.email, `Hello ${user.name}, Congratulations 🎉 your account is now verified and now you can start buying products.`);

        if (!mailStatus) {
            res.status(500).json({ status: false, error: 'Internal Server Error' });
        }

        const token = setUser(user);
        res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

const resendOtp = async (req, res) => {
    const { userid } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array()[0] });
    }
    try {
        const user = await User.findOne({ _id: userid, verified: false });
        if (!user) {
            return res.status(400).json({ status: false, error: 'User not found or already verified.' });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        await User.findByIdAndUpdate(user._id, { otp: newOtp });
        const mailStatus = await sendMail('Your new OTP Code', user.email, `Your new OTP code is ${newOtp}`);

        if (mailStatus) {
            res.status(200).json({ status: true, message: 'New OTP sent successfully!' });
        } else {
            res.status(500).json({ status: false, error: 'Failed to send OTP.' });
        }
    } catch (error) {
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};

const getUser =async (req, res) => {
 try {
    
    const userId = req.user._id;
    const user = await User.findById(userId);
    if(!user) res.status(500).json({ status: false, error: 'User Not Found' });
    return res.status(200).json({ status:true, user });

 } catch (error) {
    res.status(500).json({ status: false, error: 'Internal Server Error' });
 }
};

module.exports = {
    signup,
    login,
    updateUser,
    verifyOtp,
    resendOtp,
    getUser
};
