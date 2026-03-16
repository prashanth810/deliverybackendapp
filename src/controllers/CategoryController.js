import CategoryModel from '../models/CategoryModel.js';
import mongoose from "mongoose";
import ProductModel from '../models/ProductModel.js';
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { Envs } from "../config/Envs.js";

// ─── Cloudinary Config ────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: Envs.CLOUDINARY_CLOUD_NAME,
    api_key: Envs.CLOUDINARY_API_KEY,
    api_secret: Envs.CLOUDINARY_API_SECRET,
});

// ─── Upload buffer → Cloudinary ───────────────────────────────────────────────
const uploadToCloudinary = (fileBuffer, folder = "categories") => {
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
// GET ALL CATEGORIES  GET /api/auth/categories
// ─────────────────────────────────────────────────────────────────────────────
// ─── GET ALL CATEGORIES ───
const getcategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await CategoryModel.countDocuments();
        const categories = await CategoryModel.find({})
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: 1 }); // ← changed -1 to 1 (oldest first)

        return res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: categories,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
// ─────────────────────────────────────────────────────────────────────────────
// GET PRODUCTS BY CATEGORY  GET /api/auth/:id/products
// ─────────────────────────────────────────────────────────────────────────────
const getProductsByCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Category ID" });
        }

        const skip = (Number(page) - 1) * Number(limit);
        const products = await ProductModel.find({ categoryId: id })
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            page: Number(page),
            limit: Number(limit),
            count: products.length,
            data: products,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CATEGORY  POST /api/auth/create
// Body: multipart/form-data — name (Text) + imageurl (File)
// ─────────────────────────────────────────────────────────────────────────────
const createcategories = async (req, res) => {
    try {
        const { name } = req.body;

        // ── Validate required fields ──────────────────────────────────────────
        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        // ── Validate image ────────────────────────────────────────────────────
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Category image (imageurl) is required." });
        }

        // ── Check duplicate name ──────────────────────────────────────────────
        const exist = await CategoryModel.findOne({ name });
        if (exist) {
            return res.status(400).json({ success: false, message: "Category name already exists!" });
        }

        // ── Upload image → Cloudinary ─────────────────────────────────────────
        const imageurlResult = await uploadToCloudinary(req.file.buffer);

        // ── Create category ───────────────────────────────────────────────────
        const newcat = await CategoryModel.create({ name, imageurl: imageurlResult });

        return res.status(201).json({ success: true, message: "Category created!", data: newcat });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CATEGORY  PUT /api/auth/:id
// Body: multipart/form-data — name (Text, optional) + imageurl (File, optional)
// ─────────────────────────────────────────────────────────────────────────────
const updatecategories = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        // ── Check category exists ─────────────────────────────────────────────
        const category = await CategoryModel.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found!" });
        }

        // ── Replace image if new one uploaded ─────────────────────────────────
        let newImageUrl = category.imageurl;
        if (req.file) {
            await deleteFromCloudinary(category.imageurl); // delete old from Cloudinary
            newImageUrl = await uploadToCloudinary(req.file.buffer);
        }

        // ── Apply updates ─────────────────────────────────────────────────────
        const updatedCategory = await CategoryModel.findByIdAndUpdate(
            id,
            {
                name: name || category.name,
                imageurl: newImageUrl,
            },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CATEGORY  DELETE /api/auth/:id
// Also deletes all products under this category + images from Cloudinary
// ─────────────────────────────────────────────────────────────────────────────
const deletecategory = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await CategoryModel.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found!" });
        }

        // ── Delete all products' images from Cloudinary ───────────────────────
        const products = await ProductModel.find({ categoryId: id });
        for (const product of products) {
            await deleteFromCloudinary(product.imageurl);
            if (product.images && product.images.length > 0) {
                await Promise.all(product.images.map((url) => deleteFromCloudinary(url)));
            }
        }

        // ── Delete all products under this category ───────────────────────────
        await ProductModel.deleteMany({ categoryId: id });

        // ── Delete category image from Cloudinary ─────────────────────────────
        await deleteFromCloudinary(category.imageurl);

        // ── Delete category ───────────────────────────────────────────────────
        await CategoryModel.findByIdAndDelete(id);

        return res.status(200).json({ success: true, message: "Category and all its products deleted successfully!" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export { getcategories, getProductsByCategory, createcategories, updatecategories, deletecategory };