import { body, validationResult } from 'express-validator';
import AddressModel from '../models/AddressModel.js';


// ─── Validation Middleware ────────────────────────────────────────────────────
export const validateAddress = [
    body('name')
        .optional()
        .notEmpty()
        .withMessage('Name cannot be empty')
        .trim(),
    body('mobile')
        .optional()
        .notEmpty()
        .withMessage('Mobile cannot be empty')
        .matches(/^\+?[0-9]{7,15}$/)
        .withMessage('Enter a valid mobile number'),
    body('pincode')
        .optional()
        .notEmpty()
        .withMessage('Pincode cannot be empty')
        .matches(/^[0-9]{4,10}$/)
        .withMessage('Enter a valid pincode'),
    body('locality')
        .optional()
        .notEmpty()
        .withMessage('Locality cannot be empty')
        .trim(),
    body('type')
        .optional()
        .isIn(['HOME', 'OFFICE', 'OTHER'])
        .withMessage('Type must be HOME, OFFICE, or OTHER'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
            });
        }
        next();
    },
];


// ─── Helper ───────────────────────────────────────────────────────────────────
const sendResponse = (res, statusCode, success, message, data = null) => {
    const response = { success, message };
    if (data !== null) response.data = data;
    return res.status(statusCode).json(response);
};


// ─── GET all addresses ────────────────────────────────────────────────────────
// GET /api/addresses
export const getAllAddresses = async (req, res) => {
    try {
        const filter = {};
        if (req.query.userId) filter.userId = req.query.userId;
        if (req.query.type) filter.type = req.query.type;

        const addresses = await AddressModel.find(filter).sort({ createdAt: -1 });
        return sendResponse(res, 200, true, 'Addresses fetched successfully', addresses);
    } catch (error) {
        return sendResponse(res, 500, false, error.message);
    }
};


// ─── GET single address ───────────────────────────────────────────────────────
// GET /api/addresses/:id
export const getAddressById = async (req, res) => {
    const userId = req.params.id;

    try {
        const address = await AddressModel.findOne({ userId: userId });

        if (!address) {
            return sendResponse(res, 404, false, 'Address not found');
        }

        return sendResponse(res, 200, true, 'Address fetched successfully', address);
    } catch (error) {
        return sendResponse(res, 500, false, error.message);
    }
};
// ─── CREATE address ───────────────────────────────────────────────────────────
// POST /api/addresses
export const createAddress = async (req, res) => {
    try {
        const {
            type, name, mobile, flatNo, blockName,
            buildingName, street, landmark, pincode,
            locality, isDefault, userId,
        } = req.body;

        // ✅ FIX: was using undefined `Address`, now using AddressModel
        if (isDefault && userId) {
            await AddressModel.updateMany({ userId, isDefault: true }, { isDefault: false });
        }

        const newAddress = await AddressModel.create({
            type, name, mobile, flatNo, blockName,
            buildingName, street, landmark, pincode,
            locality,
            isDefault: isDefault || false,
            userId: userId || null,
        });

        return sendResponse(res, 201, true, 'Address created successfully', newAddress);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return sendResponse(res, 400, false, messages.join(', '));
        }
        return sendResponse(res, 500, false, error.message);
    }
};


// ─── UPDATE address ───────────────────────────────────────────────────────────
// PUT /api/addresses/:id
export const updateAddress = async (req, res) => {
    try {
        const address = await AddressModel.findById(req.params.id);
        if (!address) return sendResponse(res, 404, false, 'Address not found');

        const { isDefault, userId } = req.body;

        // ✅ FIX: was using undefined `Address`, now using AddressModel
        if (isDefault && (userId || address.userId)) {
            const uid = userId || address.userId;
            await AddressModel.updateMany(
                { userId: uid, isDefault: true, _id: { $ne: req.params.id } },
                { isDefault: false }
            );
        }

        // ✅ FIX: was using undefined `Address.findByIdAndUpdate`, now using AddressModel
        const updatedAddress = await AddressModel.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        return sendResponse(res, 200, true, 'Address updated successfully', updatedAddress);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return sendResponse(res, 400, false, messages.join(', '));
        }
        return sendResponse(res, 500, false, error.message);
    }
};


// ─── DELETE address ───────────────────────────────────────────────────────────
// DELETE /api/addresses/:id
export const deleteAddress = async (req, res) => {
    try {
        const address = await AddressModel.findByIdAndDelete(req.params.id);
        if (!address) return sendResponse(res, 404, false, 'Address not found');
        return sendResponse(res, 200, true, 'Address deleted successfully');
    } catch (error) {
        return sendResponse(res, 500, false, error.message);
    }
};


// ─── SET default address ──────────────────────────────────────────────────────
// PATCH /api/addresses/:id/set-default
export const setDefaultAddress = async (req, res) => {
    try {
        // ✅ FIX: was using undefined `Address.findById`, now using AddressModel
        const address = await AddressModel.findById(req.params.id);
        if (!address) return sendResponse(res, 404, false, 'Address not found');

        if (address.userId) {
            await AddressModel.updateMany({ userId: address.userId, isDefault: true }, { isDefault: false });
        }

        address.isDefault = true;
        await address.save();

        return sendResponse(res, 200, true, 'Default address updated', address);
    } catch (error) {
        return sendResponse(res, 500, false, error.message);
    }
};