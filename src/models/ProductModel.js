import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
    {
        categoryId: {
            type: String,
            required: true,
            ref: "Category",
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
        },
        imageurl: {
            type: String,
            required: true,
        },
        images: [{ type: String }],
        description: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true, minimize: false }
);

const ProductModel = mongoose.model("Product", ProductSchema);
export default ProductModel;