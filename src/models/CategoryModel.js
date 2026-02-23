import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    imageurl: {
        type: String,
        required: true,
    },
    products: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    },
}, { timestamps: true, minimize: false });

const CategoryModel = mongoose.model("Category", CategorySchema);
export default CategoryModel;