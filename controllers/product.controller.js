const Product = require('../models/product.model');
const Seller = require('../models/seller.model');
const Media = require('../models/media.model');
const uploadToCloudinary = require('../helpers/cloud.helper');
const { validationResult } = require('express-validator');
const Category = require('../models/category.model');
const category = require('../models/category.model');

// Get Product by ID
const getProduct = async (req, res) => {
    try {
        // Fetch the product by ID and populate category and seller details
        const product = await Product.findById(req.params.id)
        .populate('category_id')  // Populating category details
        .populate({
            path: 'seller_id',
            select: 'name _id' // Select only name and _id
        })
        .lean();// Convert MongoDB documents to plain JS objects

        if (!product) {
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        // Fetch media associated with this product
        const media = await Media.find({ product_id: product._id }).lean();

        // Attach media to the product
        product.media = media.length > 0 ? media[0].images : []; // Assuming media contains images in an array

        // Respond with the product details
        return res.status(200).json({
            status: true,
            message: 'Product retrieved successfully',
            data: product
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

const getProducts = async (req, res) => {
    try {
        // Fetch all products and populate category and seller details
        const products = await Product.find({})
            .populate('category_id')  // Populating category details
            .lean();                  // Convert MongoDB documents to plain JS objects

        // Fetch all media associated with these products
        const productIds = products.map(product => product._id);
        const media = await Media.find({ product_id: { $in: productIds } }).lean();

        // Map product IDs to their corresponding media URLs
        const mediaMap = media.reduce((acc, item) => {
            acc[item.product_id] = item.images;
            return acc;
        }, {});

        // Group products by category and attach media
        const groupedProducts = products.reduce((acc, product) => {
            const categoryName = product.category_id.name;

            if (!acc[categoryName]) {
                acc[categoryName] = [];
            }

            // Attach media to the product if it exists
            acc[categoryName].push({
                ...product,
                media: mediaMap[product._id] || []  // Attach media if exists, else an empty array
            });

            return acc;
        }, {});

        // Respond with the grouped products
        return res.status(200).json({
            status: true,
            message: 'Products retrieved and grouped by category successfully',
            data: groupedProducts
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

//Search Products
const searchProducts = async (req, res) => {
    try {
        const { keyword } = req.query; // Assume keyword is passed in the query params
        console.log(keyword);
        if (!keyword) {
            return res.status(400).json({ status: false, message: 'Keyword is required for searching' });
        }

        // Remove all special characters and symbols, allowing only alphanumeric characters and spaces
        const sanitizedKeyword = keyword.replace(/[^a-zA-Z0-9\s]/g, ' ');
        
        // Split the sanitized keyword into individual keywords
        const keywords = sanitizedKeyword.split(' ').filter(Boolean).map(kw => kw.trim());

        // Create an array for price keywords if they are valid numbers
        const priceKeywords = keywords.filter(kw => !isNaN(Number(kw))).map(kw => Number(kw));

        // Perform search across multiple fields using $or for each keyword
        const products = await Product.find({
            $or: [
                ...keywords.map(kw => ({
                    $or: [
                        { name: { $regex: kw, $options: 'i' } },        // Case-insensitive match in product name
                        { description: { $regex: kw, $options: 'i' } }, // Case-insensitive match in description
                        { tags: { $regex: kw, $options: 'i' } },        // Case-insensitive match in tags
                    ]
                })),
                // Match price if it is a valid number from priceKeywords
                ...(priceKeywords.length > 0 ? priceKeywords.map(price => ({ price })) : []),
            ]
        })
        .populate('category_id') // Populate category details without compulsory matching
        .lean();

        // Fetch all media associated with these products
        const productIds = products.map(product => product._id);
        const media = await Media.find({ product_id: { $in: productIds } }).lean();

        // Map product IDs to their corresponding media URLs
        const mediaMap = media.reduce((acc, item) => {
            acc[item.product_id] = item.images;
            return acc;
        }, {});

        // Attach media to products
        const productsWithMedia = products.map(product => ({
            ...product,
            media: mediaMap[product._id] || []  // Attach media if exists, else an empty array
        }));

        return res.status(200).json({
            status: true,
            message: 'Search results retrieved successfully',
            data: productsWithMedia
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};




// Create Product
const createProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({status:false,message: errors.array()[0].msg });
    }

    const { name, description, price, quantity, tags, category_id } = req.body;
    const userId = req.user.id;

    try {
        const seller = await Seller.findById(userId);
        if (!seller) {
            return res.status(401).json({status:false,message: "Seller not found" });
        }

        const category= await Category.findById(category_id);
        if(!category){
            return res.status(401).json({status:false,message: "Category not found" });
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
        res.status(201).json({status:true, message: 'Product created successfully', product });
    } catch (error) {
console.log(error);
        res.status(500).json({status:false, message: "Internal Server Error" });
    }
};

// Update Product
const updateProduct = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, message: errors.array()[0].msg });
    }

    const { name, description, price, quantity, tags, category_id } = req.body;

    const productId = req.params.id;
    const seller_id = req.user.id;

    try {


        const product = await Product.findOne({ _id: productId, seller_id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const category= await Category.findById(category_id);
        if(!category){
            return res.status(401).json({status:false,message: "Category not found" });
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
            
            // Update media array
            const media = await Media.findOne({ product_id: productId });
            if (media) {
                media.images = [...media.images, ...imageUrls];
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
        res.status(200).json({ status: true, message: 'Product updated successfully', product });
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const removeImage = async (req, res) => {
    const { imageUrl } = req.body;
    const product_id = req.params.id;
    try {
        // Find the media document associated with the product
        const media = await Media.findOne({ product_id });
        if (!media) {
            return res.status(404).json({ status: false, message: 'No media found for this product' });
        }

        // Remove the image URL from the media array
        media.images = media.images.filter(url => url !== imageUrl);
        await media.save();
        res.status(200).json({ status: true, message: 'Image removed successfully' });
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

// Delete Product
const deleteProduct = async (req, res) => {
    try {
        const seller_id=req.user.id;
        const product = await Product.findOneAndDelete({_id:req.params.id,seller_id});
        if (!product) {
            return res.status(404).json({status:false, message: 'Product not found' });
        }
        // Delete associated media
        await Media.findOneAndDelete({ product_id: req.params.id });
        res.status(200).json({ status:true,message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ status:false,message: "Internal Server Error" });
    }
};

const getCategories=async (req,res)=>{
    try {
        const categories = await category.find({}).select("_id name");
        res.status(200).json({ status:true,message: 'Categories Received',categories});
    } catch (error) {
        console.log("Hello");
        console.error(error);
        res.status(500).json({ status:false,message:error.message });
    }
}

module.exports = { getProduct, createProduct, updateProduct, deleteProduct,getCategories,removeImage,getProducts,searchProducts};
