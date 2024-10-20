const User = require('../models/user.model');
const { setUser } = require('../helpers/jwt.helper');
const sendMail = require('../helpers/mail.helper');
const crypto = require('crypto');
const asyncHandler = require("express-async-handler");


const signup = asyncHandler(async (req, res) => {
    

    const { name, email, phone_number, address, password } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate OTP

    try {
        // Check if the user with the given email already exists and is verified
        const existingUser = await User.findOne({ email, verified: true });
        if (existingUser) {
            return res.status(400).json({ status: false, message: 'User already exists with this email.' });
        }

        // Check if the user with the given phone number already exists and is verified
        const existingUser2 = await User.findOne({ phone_number, verified: true });
        if (existingUser2) {
            return res.status(400).json({ status: false, message: 'User already exists with this phone number.' });
        }

        let user;
        const newUser = await User.findOne({ email, verified: false });

        if (!newUser) {
            user = await User.create({ name, email, phone_number, address, password, otp });
        } else {
            // Update existing useer
            newUser.phone_number = phone_number;
            newUser.address = address;
            newUser.otp = otp; // Set OTP
            newUser.password = password;
            await newUser.save();
            user = newUser;
        }

        const mailStatus = await sendMail('TJ Bazaar🛒: Your OTP Code', email, `Your OTP code is ${otp}`);
        if (mailStatus) {
    // Respond with success and the created user
            res.status(201).json({ status: true, message: 'Verification is Needed!', user });
        } else {
            res.status(500).json({ status: false, message: 'Failed to send OTP.' });
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});


const login = asyncHandler(async (req, res) => {
    

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, verified: true });
        if (!user) {
            return res.status(400).json({ status: false, message: 'Invalid email or password.' });
        }

        const isMatch = await user.isPasswordCorrect(password);
        if (!isMatch) {
            return res.status(400).json({ status: false, message: 'Invalid email or password.' });
        }

        const token = setUser(user);
        const rec_email=user.email;
        const mailStatus = await sendMail('TJ Bazaar🛒: You Logged In as User on new Device', rec_email, 
            `TJ Bazaar🛒 Just wanted to let you know that your account has been loggedIn in a new device`);
            
        res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const updateUser = asyncHandler(async (req, res) => {
    

    const { name, email, phone_number, address } = req.body;

    try {
        const userId = req.user.id; // Assuming user ID is extracted from a middleware

        const user = await User.findByIdAndUpdate(
            userId,
            { name, email, phone_number, address },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found.' });
        }

        res.status(200).json({ status: true, message: 'User details updated successfully!', user });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const verifyOtp = asyncHandler(async (req, res) => {
    

    const { otp } = req.body;
    const { userid } = req.params;

    try {
        const user = await User.findOne({ _id: userid, otp, verified: false });
        if (!user) {
            return res.status(400).json({ status: false, message: 'Invalid OTP or user already verified.' });
        }

        await User.findByIdAndUpdate(user._id, { verified: true, otp: null });
        const mailStatus = await sendMail('TJ Bazaar🛒: Account Verified Successfully ✅', user.email, `Hello ${user.name}, Congratulations 🎉 your account is now verified and now you can start buying products.`);

        if (!mailStatus) {
            res.status(500).json({ status: false, message: 'Internal Server Error' });
        }

        const token = setUser(user);
        res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const resendOtp = asyncHandler(async (req, res) => {
    const { userid } = req.params;
    
    try {
        const user = await User.findOne({ _id: userid, verified: false });
        if (!user) {
            return res.status(400).json({ status: false, message: 'User not found or already verified.' });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        await User.findByIdAndUpdate(user._id, { otp: newOtp });
        const mailStatus = await sendMail('TJ Bazaar🛒: Your new OTP Code', user.email, `Your new OTP code is ${newOtp}`);

        if (mailStatus) {
            res.status(200).json({ status: true, message: 'New OTP sent successfully!' });
        } else {
            res.status(500).json({ status: false, message: 'Failed to send OTP.' });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const getUser =asyncHandler(async (req, res) => {
 try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password -otp -__v -verified");
    if(!user) return res.status(500).json({ status: false, message: 'User Not Found' });
    return res.status(200).json({ status:true,message:"User Fetched", user });
 } catch (error) {
    res.status(500).json({ status: false, message: 'Internal Server Error' });
 }
});

const forgotPassword = asyncHandler(async (req, res) => {
    try {
    const { email } = req.body;
    const user = await User.findOne({ email, verified: true });
    if (!user) return res.status(404).json({ status: false, message: 'No Account Exists' });

    const otp = crypto.randomInt(100000, 999999).toString(); // Generate OTP
    user.otp = otp; // Save OTP in the user document
    await user.save();

    const mailStatus = await sendMail('TJ Bazaar🛒: Your OTP Code to Reset Password', user.email, `Your OTP code to Reset Password is ${otp}`);

    if (mailStatus) {
        res.status(200).json({ status: true, message: 'OTP Sent to your Email!' });
    } else {
        res.status(500).json({ status: false, message: 'Failed to send OTP.' });
    }           
} catch (error) {
    res.status(500).json({ status: false, message: 'Failed to send OTP.' });
}
});

const changePassword=asyncHandler(async(req,res)=>{
    try {
    const {email,otp,password}=req.body;
    const user=await User.findOne({email,otp,verified:true});
    if(!user) return res.status(404).json({ status: false, message: 'OTP Not Correct' });
    user.password = password;
    user.otp=null;
    await user.save();
    const mailStatus = await sendMail('TJ Bazaar🛒: Password Changed Successfully ✅', user.email, `TJ Bazaar🛒: Password Changed Successfully ✅`);
    return res.status(200).json({ status: true, message:"Password updated successfully"}); 
} catch (error) {
    res.status(500).json({ status: false, message: 'Failed to send OTP.' });   
}
});



module.exports = {
    signup,
    login,
    updateUser,
    verifyOtp,
    resendOtp,
    getUser,
    forgotPassword,
    changePassword
};
