const Product = require('../models/product.model');
const Seller = require('../models/seller.model');
const Media = require('../models/media.model');
const uploadToCloudinary = require('../helpers/cloud.helper');
const { validationResult } = require('express-validator');

// Get Product by ID
const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category_id')
            .populate('seller_id');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create Product
const createProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, quantity, tags, category_id } = req.body;
    const userId = req.user.id;

    try {
        const seller = await Seller.findById(userId);
        if (!seller) {
            return res.status(401).json({ message: "Seller not found" });
        }

        const product = new Product({
            name,
            description,
            price,
            quantity,
            tags,
            category_id,
            seller_id: userId
        });

        // Handle image uploads
        if (req.files && req.files.length > 0) {
            const imageUploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
            const imageUrls = await Promise.all(imageUploadPromises);

            const media = new Media({
                product_id: product._id,
                images: imageUrls
            });

            await media.save();
        }

        await product.save();
        res.status(201).json({ message: 'Product created successfully', product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Product
const updateProduct = async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, quantity, tags, category_id } = req.body;
    const productId = req.params.id;

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        product.quantity = quantity || product.quantity;
        product.tags = tags || product.tags;
        product.category_id = category_id || product.category_id;

        // Handle image uploads if files are provided
        if (req.files && req.files.length > 0) {
            const imageUploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
            const imageUrls = await Promise.all(imageUploadPromises);

            const media = await Media.findOne({ product_id: productId });
            if (media) {
                media.images.push(...imageUrls);
                await media.save();
            } else {
                const newMedia = new Media({
                    product_id: productId,
                    images: imageUrls
                });
                await newMedia.save();
            }
        }

        await product.save();
        res.status(200).json({ message: 'Product updated successfully', product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete Product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Delete associated media
        await Media.findOneAndDelete({ product_id: req.params.id });

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getProduct, createProduct, updateProduct, deleteProduct };
