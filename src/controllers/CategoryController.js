import CategoModel from '../models/CategoryModel.js';
import mongoose from "mongoose";
import ProductModel from '../models/ProductModel.js';
import CategoryModel from '../models/CategoryModel.js';

// get all categories with pagenatation
const getcategories = async (req, res) => {

    try {
        // ✅ properly extract query params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;
        // total count
        const total = await CategoModel.countDocuments();

        // paginated data
        const categories = await CategoModel.find({})
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: categories,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// get products by category
const getProductsByCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Validate Mongo ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Category ID",
            });
        }

        const skip = (Number(page) - 1) * Number(limit);

        const products = await ProductModel.find({
            categoryId: id,
        })
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            page: Number(page),
            limit: Number(limit),
            count: products.length,
            data: products,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// create categories
const createcategories = async (req, res) => {
    const { name, imageurl } = req.body;
    try {
        const exist = await CategoryModel.findOne({ name });
        if (exist) {
            return res.status(400).json({ success: false, message: "Category name already exist !" });
        }

        // Validation
        if (!name || !imageurl) {
            return res.status(400).json({
                success: false,
                message: "Name and imageurl are required",
            });
        }

        const newcat = await CategoryModel.create({
            name,
            imageurl,
        });

        return res.status(201).json({ success: true, message: "category created !", data: newcat });

    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}


/// update categories 
const updatecategories = async (req, res) => {
    const { id } = req.params;
    const { name, imageurl } = req.body;
    try {

        if (!category) {
            return res.status(404).json({ success: false, message: "category is not found !!" });
        }

        if (!name || !name.trim() || !imageurl) {
            return res.status(400).json({
                success: false,
                message: "Name and imageurl are required",
            });
        }

        // 3️⃣ Update category
        const updatedCategory = await CategoModel.findByIdAndUpdate(
            id,
            { name, imageurl },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });


    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

//delete categories
const deletecategory = async (req, res) => {
    const { id } = req.params;
    try {

        const category = await CategoryModel.findById(id);

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found !!" });
        };

        await ProductModel.deleteMany({ categoryId: id });

        await CategoModel.findOneAndDelete(id);

        return res.status(200).json({ success: true, message: "category deleted successfully !!" });
    }
    catch (error) {
        returnres.status(500).json({ success: false, message: error.message });
    }
}

export { getcategories, getProductsByCategory, createcategories, updatecategories, deletecategory };