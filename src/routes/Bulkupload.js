
import multer from "multer";
import express from "express";
import { bulkUploadProducts } from "../controllers/Bulkuploadproducts.js";

const Bulkupload = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

Bulkupload.post(
    "/products/bulk-upload",
    upload.fields([
        { name: "excelFile", maxCount: 1 },
        { name: "zipFile", maxCount: 1 },
    ]),
    bulkUploadProducts
);


export default Bulkupload;