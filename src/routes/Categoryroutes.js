import express from "express";
import multer from "multer";
import {
    getcategories,
    getProductsByCategory,
    createcategories,
    updatecategories,
    deletecategory
} from "../controllers/CategoryController.js";

const Categoryroute = express.Router();

// ─── Multer memory storage (no local folder needed) ───────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only jpeg, png, webp images are allowed."));
        }
    },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
Categoryroute.get("/categories", getcategories);
Categoryroute.get("/:id/products", getProductsByCategory);
Categoryroute.post("/create", upload.single("imageurl"), createcategories);
Categoryroute.put("/:id", upload.single("imageurl"), updatecategories);
Categoryroute.delete("/:id", deletecategory);

export default Categoryroute;