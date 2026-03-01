import express from "express";
import multer from "multer";
import {
    addProduct, getAllProducts, getProductById, updateProduct,
    deleteProduct
} from "../controllers/ProductController.js";

const Productroutes = express.Router();

// ─── Use memory storage — no local folder needed ──────────────────────────────
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only jpeg, png, webp images are allowed."));
        }
    },
});

const productUpload = upload.fields([
    { name: "imageurl", maxCount: 1 },
    { name: "images", maxCount: 10 },
]);

Productroutes.post("/addproducts", productUpload, addProduct);
Productroutes.get("/products", getAllProducts);
Productroutes.get("/products/:id", getProductById);
Productroutes.put("/products/:id", productUpload, updateProduct);
Productroutes.delete("/products/:id", deleteProduct);

export default Productroutes;