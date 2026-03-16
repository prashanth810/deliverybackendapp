import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
    },
    phone: {
        type: String,
    },
    googleId: {
        type: String,
    },
    avatar: {
        type: String,
    },
    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER",
    },
    orders: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
    },
}, { timestamps: true, minimize: false });

const UserModel = mongoose.model("User", UserSchema);
export default UserModel;