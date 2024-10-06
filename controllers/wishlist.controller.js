const expressAsyncHandler = require("express-async-handler");
const Wishlist = require("../models/wishlist.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");
const Media = require("../models/media.model");

// Add to wishlist
const addToWishlist = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const { product_id } = req.body;
        const user = await User.findById(user_id);
        if (!user) return res.status(404).json({ status: false, message: 'User Not Found' });
        const product = await Product.findById(product_id);
        if (!product) return res.status(404).json({ status: false, message: 'Product Not Found' });
        // Check if the product is already in the wishlist
        const existingWishlistItem = await Wishlist.findOne({ user_id, product_id });
        if (existingWishlistItem) return res.status(200).json({ status: true, message: 'Product already in Wishlist' });

        const wishlistItem = await Wishlist.create({ user_id, product_id });
        if (!wishlistItem) return res.status(500).json({ status: false, message: 'Failed to add to Wishlist' });

        res.status(200).json({ status: true, message: 'Added to Wishlist successfully' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

// Remove from wishlist
const removeFromWishlist = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const product_id = req.params.id;
        const wishlistItem = await Wishlist.findOneAndDelete({ user_id, product_id});
        if (!wishlistItem) return res.status(404).json({ status: false, message: 'Wishlist item not found' });

        res.status(200).json({ status: true, message: 'Removed from Wishlist successfully' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

// Get wishlist items for the user
const getWishlist = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const user = await User.findById(user_id).select('-password -otp -__v -verified');
        if (!user) return res.status(404).json({ status: false, message: 'User Not Found' });

        const wishlist = await Wishlist.find({ user_id }).populate('product_id');
        
        // Map through wishlist items to include product details and the first image of the product
        const wishlistWithDetails = await Promise.all(wishlist.map(async (item) => {
            const product = item.product_id;
            const media = await Media.findOne({ product_id: product._id }); // Fetch media for the product
            const image = media?.images[0]; // Get the first image

            return {
                ...item.toObject(),
                image
            };
        }));

        res.status(200).json({ status: true, message: 'User Wishlist', data: wishlistWithDetails });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});


// Check if a product is in the wishlist
const checkInWishlist = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const product_id = req.params.product_id;

        const wishlistItem = await Wishlist.findOne({ user_id, product_id });
        if (!wishlistItem) return res.status(404).json({ status: false, message: 'Product not in Wishlist' });

        res.status(200).json({ status: true, message: 'Product found in Wishlist' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

//WishList
const getWishlistItemCount = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        // Fetch only the quantity field for all wishlist items of the user
        const wishlistItems = await Wishlist.find({ user_id });
        const count=wishlistItems.length;
        return res.status(200).json({ status: true, message: "wishlist item count fetched successfully", count });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkInWishlist,
    getWishlistItemCount
};
