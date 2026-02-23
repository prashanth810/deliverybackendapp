import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["HOME", "OFFICE", "OTHER"],
        default: "HOME",
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    mobile: {
        type: String,
        required: true,
    },
    flatNo: {
        type: String,
        required: true,
    },
    buildingName: {
        type: String,
    },
    street: {
        type: String,
    },
    landmark: {
        type: String,
    },
    pincode: {
        type: String,
        required: true,
    },
    locality: {
        type: String,
        required: true,
    }
}, { timestamps: true, minimize: false });

const AddressModel = mongoose.model("Address", AddressSchema);
export default AddressModel;