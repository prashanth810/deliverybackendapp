import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                },
                name: String,
                price: Number,
                quantity: Number,
            },
        ],

        totalAmount: {
            type: Number,
            required: true,
        },

        status: {
            type: String,
            enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
            default: "Pending",
        },

        address: {
            name: { type: String, required: true, trim: true },
            mobile: { type: String, required: true },
            flatNo: { type: String, required: true },
            buildingName: String,
            street: String,
            landmark: String,
            pincode: { type: String, required: true },
            locality: { type: String, required: true },
        },

        paymentMethod: {
            type: String,
            enum: ["ONLINE", "COD"],
            default: "ONLINE",
        },

        paymentId: String,
        razorpayOrderId: String,
    }, { timestamps: true, minimize: false });

const Order = mongoose.model("Order", orderSchema);

export default Order;