const Seller = require('../models/seller.model');
const { setUser } = require('../helpers/jwt.helper');
const asyncHandler = require('express-async-handler');
const sendMail = require('../helpers/mail.helper');
const crypto = require('crypto');
const Product = require('../models/product.model');
const Media = require('../models/media.model');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload(); // Safe, verified info
        return payload; // Contains email, name, sub, etc.
    } catch (error) {
        throw new Error("Not valid Google Login");
    }
}
// Signup
const signup = asyncHandler(async (req, res) => {
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
});

// Login
const login = asyncHandler(async (req, res) => {
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
        seller.password = null;
        res.status(200).json({ status: true, message: 'Login successful!', token, user: seller });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

// Update Seller Details
const updateSeller = asyncHandler(async (req, res) => {


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
});

// Verify OTP
const verifyOtp = asyncHandler(async (req, res) => {


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
        seller.password = null;
        res.status(200).json({ status: true, message: 'Seller verified successfully!', token, user: seller });

    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

// Resend OTP
const resendOtp = asyncHandler(async (req, res) => {
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
});

const getProducts = asyncHandler(async (req, res) => {


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
});

const getOrders = asyncHandler(async (req, res) => {
    try {
        const seller_id = req.user.id;
        // Fetch all products for the seller
        const products = await Product.find({ seller_id }).select('_id');
        const productIds = products.map(product => product._id);

        if (productIds.length === 0) {
            return res.status(200).json({ status: true, message: 'No products found for this seller' });
        }

        // Fetch orders related to any of the seller's products
        const orders = await Order.find({ product_id: { $in: productIds }, order_status: true })
            .populate({
                path: 'product_id',
                select: 'name price' // Only get required product fields
            })
            .populate({
                path: 'user_id',
                select: 'name address phone_number' // Only get user name and address
            });

        if (orders.length === 0) {
            return res.status(404).json({ status: false, message: 'No orders found for this seller\'s products', data: [] });
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

const getSeller = asyncHandler(async (req, res) => {
    try {

        const sellerId = req.user.id;
        const seller = await Seller.findById(sellerId).select("-password -otp -__v -verified");;
        if (!seller) return res.status(500).json({ status: false, message: 'Seller Not Found' });
        return res.status(200).json({ status: true, message: "Seller Found", data: seller });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
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
});

const changePassword = asyncHandler(async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        const seller = await Seller.findOne({ email, otp, verified: true });
        if (!seller) return res.status(404).json({ status: false, message: 'OTP Not Correct' });
        seller.password = password;
        seller.otp = null;
        await seller.save();
        const mailStatus = await sendMail('TJ Bazaar🛒: Password Changed Successfully ✅', seller.email, `TJ Bazaar🛒: Password Changed Successfully ✅`);
        return res.status(200).json({ status: true, message: "Password updated successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Failed to verify OTP.' });
    }
});

const google_login = asyncHandler(async (req, res) => {
    const details = await verifyGoogleToken(req.body.token);
    const { email, name, sub: google_id } = details;
    const sanitized_name = name.replace(/[^a-zA-Z\s]/g, "").trim();

    // Function to generate a random GST number matching the regex pattern
    const generateRandomGSTNumber = () => {
        const stateCode = String(Math.floor(Math.random() * 35) + 1).padStart(2, '0'); // State code (01-35)
        const panLikeNumber = `${generateRandomAlphabets(5)}${generateRandomDigits(4)}${generateRandomAlphabets(1)}`; // PAN-like structure
        const entityCode = getRandomEntityCode(); // 1-9 or A-Z
        const checksum = getRandomAlphanumeric(); // 0-9 or A-Z
        return `${stateCode}${panLikeNumber}${entityCode}Z${checksum}`;
    };

    const generateRandomAlphabets = (length) => {
        return Array.from({ length }, () =>
            String.fromCharCode(65 + Math.floor(Math.random() * 26))
        ).join(''); // A-Z
    };

    const generateRandomDigits = (length) => {
        return Array.from({ length }, () =>
            Math.floor(Math.random() * 10)
        ).join(''); // 0-9
    };

    const getRandomEntityCode = () => {
        const chars = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return chars[Math.floor(Math.random() * chars.length)];
    };

    const getRandomAlphanumeric = () => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return chars[Math.floor(Math.random() * chars.length)];
    };

    try {
        // Check if the user exists
        let seller = await Seller.findOne({ email });

        if (!seller) {
            // Generate random details for signup
            const randomPassword = Math.random().toString(36).slice(-8); // Random strong password of length 8
            const randomPhoneNumber = `9${Math.floor(100000000 + Math.random() * 900000000)}`; // Random unique 10-digit phone number
            const dummyAddress = "Dummy Address, Not Provided";
            const randomGSTNumber = generateRandomGSTNumber(); // Generate random GST number

            // Create a new user with the provided Google ID and other dummy details
            seller = await Seller.create({
                name: sanitized_name,
                email,
                google_id,
                phone_number: randomPhoneNumber,
                address: dummyAddress,
                password: randomPassword,
                gst_number: randomGSTNumber,
                verified: true, // Mark user as verified since logged in with Google
            });

            // Optionally, send a welcome email with login details (optional step)
            const welcomeMailStatus = await sendMail(
                "TJ Bazaar🛒: You Logged In as Seller on new Device!",
                email,
                `Dear ${name},\n\nYour account has been successfully created via Google Login.\n\nLogin Details:\nEmail: ${email}\nTemporary Password: ${randomPassword}\n\nPlease change your password after login.`
            );
            if (!welcomeMailStatus) {
                console.error("Failed to send welcome email.");
            }
        } else {
            // If the user exists, validate Google ID
            if (seller.google_id && seller.google_id !== google_id) {
                return res.status(400).json({ status: false, message: 'Invalid Google ID' });
            }
            // Associate the Google ID with the user
            seller.google_id = google_id;
            await seller.save();
        }

        seller.otp = null;
        seller.verified = true;
        await seller.save();

        // Generate JWT token for the user
        const token = setUser(seller);

        // Notify user about login via email (optional step)
        const mailStatus = await sendMail(
            'TJ Bazaar🛒: You Logged In as Seller on new Device',
            email,
            `Dear ${name},\n\nYour account has been logged in on a new device.\n\nIf this wasn't you, please contact our support team immediately.`
        );
        if (!mailStatus) {
            console.error("Failed to send login notification email.");
        }
        seller.password = null;
        // Respond with success
        return res.status(200).json({ status: true, message: 'Login successful!', token, user: seller });
    } catch (error) {
        console.error("Google Login Error:", error);
        return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});




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
    changePassword,
    google_login
};