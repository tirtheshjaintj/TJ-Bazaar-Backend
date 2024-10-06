const expressAsyncHandler = require("express-async-handler");
const Cart = require("../models/cart.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");
const Media = require("../models/media.model");
const addToCart = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const { product_id, quantity } = req.body;
        const user = await User.findById(user_id);
        if (!user) return res.status(404).json({ status: false, message: 'User Not Found' });
        const product = await Product.findById(product_id);
        if (!product) return res.status(404).json({ status: false, message: 'Product Not Found' });
        if (quantity > product.quantity) return res.status(404).json({ status: false, message: "Quantity is out of Stock" });

        const cart = await Cart.create({
            user_id,
            product_id,
            quantity
        });

        if (!cart) return res.status(500).json({ status: false, message: 'Internal Server Error' });
        res.status(200).json({ status: true, message: 'Added in Cart Successfully' });
        
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const removeFromCart = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const cart_id = req.params.id;
        const cartItem = await Cart.findOneAndDelete({user_id,_id:cart_id});
        if (!cartItem) return res.status(404).json({ status: false, message: 'Item not found in Cart' });
        res.status(200).json({ status: true, message: 'Removed from Cart Successfully' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const getCart = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;
        const user = await User.findById(user_id).select("-password -otp -__v -verified");
        if (!user) return res.status(404).json({ status: false, message: 'User Not Found' });

        const cart = await Cart.find({ user_id }).populate("product_id");

        // Map through cart items to include one image of the product
        const cartWithImages = await Promise.all(cart.map(async (item) => {
            const product = item.product_id;
            const media = await Media.findOne({ product_id: product._id }); // Fetch media for the product
            const image = media?.images[0]; // Get the first image

            return {
                ...item.toObject(), // Spread the existing cart item fields
                image
            };
        }));

        return res.status(200).json({ status: true, message: "User Cart is Here", data: cartWithImages });

    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});


const getCheckCart = expressAsyncHandler(async (req,res) => {
try {
    const user_id = req.user.id;
    const product_id= req.params.id;
    const cartItem = await Cart.findOne({ user_id, product_id });
    if (!cartItem) return res.status(404).json({ status: false, message: 'Item not found in Cart' });
    return res.status(200).json({ status: true, message:"Item Found"});
} catch (error) {
    res.status(500).json({ status: false, message: 'Internal Server Error' });
}
});

const getCartItemCount = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user.id;

        // Fetch only the quantity field for all cart items of the user
        const cartItems = await Cart.find({ user_id }).select('quantity');

        // Sum up quantities of all cart items
        const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

        return res.status(200).json({ status: true, message: "Cart item count fetched successfully", count: totalQuantity });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});




module.exports = {
    addToCart,
    removeFromCart,
    getCart,
    getCheckCart,
    getCartItemCount
};
