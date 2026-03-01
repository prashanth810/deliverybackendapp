import ProductModel from "../models/ProductModel.js";
import CategoryModel from "../models/CategoryModel.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { Envs } from "../config/Envs.js";

// ─── Cloudinary Config ────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: Envs.CLOUDINARY_CLOUD_NAME,
    api_key: Envs.CLOUDINARY_API_KEY,
    api_secret: Envs.CLOUDINARY_API_SECRET,
});

// ─── Upload buffer → Cloudinary, returns only URL ────────────────────────────
const uploadToCloudinary = (fileBuffer, folder = "products") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

// ─── Extract public_id from Cloudinary URL ────────────────────────────────────
const getPublicIdFromUrl = (url) => {
    try {
        const parts = url.split("/upload/");
        const afterUpload = parts[1];
        const withoutVersion = afterUpload.replace(/^v\d+\//, "");
        const withoutExtension = withoutVersion.replace(/\.[^/.]+$/, "");
        return withoutExtension;
    } catch {
        return null;
    }
};

// ─── Delete image from Cloudinary using URL ───────────────────────────────────
const deleteFromCloudinary = async (imageUrl) => {
    if (!imageUrl) return;
    const public_id = getPublicIdFromUrl(imageUrl);
    if (public_id) await cloudinary.uploader.destroy(public_id);
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD PRODUCT  POST /api/auth/addproducts
// ─────────────────────────────────────────────────────────────────────────────
export const addProduct = async (req, res) => {
    try {
        const { name, price, stock, description, categoryId } = req.body;

        // ── Validate required fields ──────────────────────────────────────────
        if (!name || !price || !description || !categoryId || stock === undefined) {
            return res.status(400).json({
                success: false,
                message: "name, price, stock, description, and categoryId are required.",
            });
        }

        // ── Check category exists ─────────────────────────────────────────────
        const category = await CategoryModel.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: `Category with id '${categoryId}' not found.`,
            });
        }

        // ── Validate main image ───────────────────────────────────────────────
        if (!req.files || !req.files.imageurl) {
            return res.status(400).json({
                success: false,
                message: "Main product image (imageurl) is required.",
            });
        }

        // ── Upload main image → Cloudinary ────────────────────────────────────
        const imageurlResult = await uploadToCloudinary(req.files.imageurl[0].buffer);

        // ── Upload additional images → Cloudinary (optional) ──────────────────
        let additionalImageUrls = [];
        if (req.files.images && req.files.images.length > 0) {
            additionalImageUrls = await Promise.all(
                req.files.images.map((file) => uploadToCloudinary(file.buffer))
            );
        }

        // ── Create product ────────────────────────────────────────────────────
        const product = await ProductModel.create({
            categoryId,
            name,
            price,
            stock,
            description,
            imageurl: imageurlResult,
            images: additionalImageUrls,
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully.",
            data: product,
        });
    } catch (error) {
        console.error("addProduct error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PRODUCTS  GET /api/auth/products
// ─────────────────────────────────────────────────────────────────────────────
export const getAllProducts = async (req, res) => {
    try {
        const products = await ProductModel.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: products.length,
            data: products,
        });
    } catch (error) {
        console.error("getAllProducts error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PRODUCT BY ID  GET /api/auth/products/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await ProductModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        return res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error("getProductById error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PRODUCT  PUT /api/auth/products/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, stock, description, categoryId } = req.body;

    try {
        const product = await ProductModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        // ── Validate category if provided ─────────────────────────────────────
        if (categoryId) {
            const category = await CategoryModel.findById(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: `Category with id '${categoryId}' not found.`,
                });
            }
        }

        // ── Replace main image if new one uploaded ────────────────────────────
        let newImageUrl = product.imageurl;
        if (req.files && req.files.imageurl) {
            await deleteFromCloudinary(product.imageurl);
            newImageUrl = await uploadToCloudinary(req.files.imageurl[0].buffer);
        }

        // ── Replace extra images if new ones uploaded ─────────────────────────
        let newImages = product.images;
        if (req.files && req.files.images && req.files.images.length > 0) {
            if (product.images && product.images.length > 0) {
                await Promise.all(product.images.map((url) => deleteFromCloudinary(url)));
            }
            newImages = await Promise.all(
                req.files.images.map((file) => uploadToCloudinary(file.buffer))
            );
        }

        // ── Apply updates ─────────────────────────────────────────────────────
        const updated = await ProductModel.findByIdAndUpdate(
            id,
            {
                name: name || product.name,
                price: price || product.price,
                stock: stock !== undefined ? stock : product.stock,
                description: description || product.description,
                categoryId: categoryId || product.categoryId,
                imageurl: newImageUrl,
                images: newImages,
            },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            data: updated,
        });
    } catch (error) {
        console.error("updateProduct error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE PRODUCT  DELETE /api/auth/products/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await ProductModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        // ── Delete all images from Cloudinary ─────────────────────────────────
        await deleteFromCloudinary(product.imageurl);
        if (product.images && product.images.length > 0) {
            await Promise.all(product.images.map((url) => deleteFromCloudinary(url)));
        }

        await ProductModel.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Product and all its images deleted successfully.",
        });
    } catch (error) {
        console.error("deleteProduct error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};