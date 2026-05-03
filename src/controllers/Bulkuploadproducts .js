import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import ProductModel from "../models/ProductModel.js";
import CategoryModel from "../models/CategoryModel.js";
import { Envs } from "../config/Envs.js";

// ─── Cloudinary Config ────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: Envs.CLOUDINARY_CLOUD_NAME,
    api_key: Envs.CLOUDINARY_API_KEY,
    api_secret: Envs.CLOUDINARY_API_SECRET,
});

// ─── Upload a raw buffer → Cloudinary, returns secure_url ────────────────────
const uploadBufferToCloudinary = (buffer, folder = "products") =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
            if (err) reject(err);
            else resolve(result.secure_url);
        });
        streamifier.createReadStream(buffer).pipe(stream);
    });

// ─────────────────────────────────────────────────────────────────────────────
// BULK UPLOAD PRODUCTS  POST /api/auth/products/bulk-upload
// ─────────────────────────────────────────────────────────────────────────────
//
// Request  : multipart/form-data
//   • excelFile  — .xlsx file  (field name: excelFile)
//   • zipFile    — .zip of all product images (field name: zipFile)
//
// Excel columns (row 1 = headers, row 2 = hint row skipped, row 3+ = data):
//   name | price | stock | description | categoryId
//   imageFilename          — main image filename inside ZIP  (required)
//   imageFilenames         — comma-separated extra image filenames (optional)
//
// Response:
//   { success, inserted, skipped, errors[] }
//
// ─────────────────────────────────────────────────────────────────────────────

export const bulkUploadProducts = async (req, res) => {
    try {
        // ── 1. Validate both files are present ────────────────────────────────
        if (!req.files?.excelFile?.[0]) {
            return res.status(400).json({
                success: false,
                message: "Please upload the Excel file in the 'excelFile' field.",
            });
        }
        if (!req.files?.zipFile?.[0]) {
            return res.status(400).json({
                success: false,
                message: "Please upload the ZIP of images in the 'zipFile' field.",
            });
        }

        const excelBuffer = req.files.excelFile[0].buffer;
        const zipBuffer = req.files.zipFile[0].buffer;

        // ── 2. Parse Excel ────────────────────────────────────────────────────
        const workbook = XLSX.read(excelBuffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // All rows as objects; row 2 is a human-readable hint row — skip it
        const allRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
        // Drop the hint row (index 0 after header) if its 'name' cell looks like a note
        const rows = allRows.filter((_, i) => i !== 0 || !/required|optional|e\.g/i.test(allRows[0]?.name ?? ""));

        if (!rows.length) {
            return res.status(400).json({ success: false, message: "Excel file has no data rows." });
        }

        // Normalise keys: trim + lowercase
        const norm = (obj) =>
            Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.trim().toLowerCase(), String(v).trim()]));
        const normRows = rows.map(norm);

        // ── 3. Extract ZIP → Map<filename, Buffer> ────────────────────────────
        const zip = await JSZip.loadAsync(zipBuffer);
        const imageMap = {}; // filename (lowercase) → Buffer

        await Promise.all(
            Object.keys(zip.files).map(async (path) => {
                const zipEntry = zip.files[path];
                if (zipEntry.dir) return;

                // Strip folder prefix if any — we only care about the basename
                const filename = path.split("/").pop().toLowerCase();
                if (/\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
                    imageMap[filename] = await zipEntry.async("nodebuffer");
                }
            })
        );

        // ── 4. Pre-validate categoryIds with one DB query ─────────────────────
        const categoryIds = [...new Set(normRows.map((r) => r.categoryid).filter(Boolean))];
        const foundCats = await CategoryModel.find({ _id: { $in: categoryIds } }).select("_id");
        const validCatSet = new Set(foundCats.map((c) => c._id.toString()));

        // ── 5. Process rows ───────────────────────────────────────────────────
        const toInsert = [];
        const errors = [];

        // We process rows sequentially to avoid hammering Cloudinary; for speed
        // you can switch to batched Promise.all (e.g. 10 at a time).
        for (let i = 0; i < normRows.length; i++) {
            const row = normRows[i];
            const rowNum = i + 3; // row 1=header, row 2=hint, data starts row 3
            const errs = [];

            const { name, price, stock, description, categoryid, imagefilename, imagefilenames } = row;

            // Required field checks
            if (!name) errs.push("'name' is missing");
            if (!price) errs.push("'price' is missing");
            if (stock === "") errs.push("'stock' is missing");
            if (!description) errs.push("'description' is missing");
            if (!categoryid) errs.push("'categoryId' is missing");
            if (!imagefilename) errs.push("'imageFilename' is missing");

            const parsedPrice = parseFloat(price);
            const parsedStock = parseInt(stock, 10);
            if (price && isNaN(parsedPrice)) errs.push("'price' must be a number");
            if (stock !== "" && isNaN(parsedStock)) errs.push("'stock' must be an integer");
            if (categoryid && !validCatSet.has(categoryid))
                errs.push(`categoryId '${categoryid}' not found`);

            // Image filename checks against ZIP contents
            const mainKey = imagefilename?.toLowerCase();
            if (mainKey && !imageMap[mainKey])
                errs.push(`Main image '${imagefilename}' not found in ZIP`);

            const extraKeys = imagefilenames
                ? imagefilenames.split(",").map((f) => f.trim().toLowerCase()).filter(Boolean)
                : [];
            const missingExtras = extraKeys.filter((k) => !imageMap[k]);
            if (missingExtras.length)
                errs.push(`Extra image(s) not found in ZIP: ${missingExtras.join(", ")}`);

            if (errs.length) {
                errors.push({ row: rowNum, name: name || "(empty)", issues: errs });
                continue;
            }

            // ── Upload main image → Cloudinary ────────────────────────────────
            let mainImageUrl = "";
            try {
                mainImageUrl = await uploadBufferToCloudinary(imageMap[mainKey]);
            } catch (uploadErr) {
                errors.push({ row: rowNum, name, issues: [`Cloudinary upload failed for main image: ${uploadErr.message}`] });
                continue;
            }

            // ── Upload extra images → Cloudinary ──────────────────────────────
            let extraUrls = [];
            if (extraKeys.length) {
                try {
                    extraUrls = await Promise.all(
                        extraKeys.map((k) => uploadBufferToCloudinary(imageMap[k]))
                    );
                } catch (uploadErr) {
                    errors.push({ row: rowNum, name, issues: [`Cloudinary upload failed for extra image: ${uploadErr.message}`] });
                    continue;
                }
            }

            toInsert.push({
                name,
                price: parsedPrice,
                stock: parsedStock,
                description,
                categoryId: categoryid,
                imageurl: mainImageUrl,
                images: extraUrls,
            });
        }

        // ── 6. Bulk insert ────────────────────────────────────────────────────
        let insertedCount = 0;
        if (toInsert.length) {
            const result = await ProductModel.insertMany(toInsert, { ordered: false });
            insertedCount = result.length;
        }

        // ── 7. Respond ────────────────────────────────────────────────────────
        return res.status(200).json({
            success: true,
            message: `Bulk upload done. ${insertedCount} inserted, ${errors.length} skipped.`,
            inserted: insertedCount,
            skipped: errors.length,
            errors,
        });

    } catch (error) {
        console.error("bulkUploadProducts error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};