import express from "express";
import { z } from "zod";
import Authmiddleware from "../middlewares/Authmiddleware.js";
import {
    getOrders, createOrder, getUserOrders, getOrderById,
    updateOrderStatus, cancelOrder, createRazorpayOrder
} from "../controllers/OrdersController.js";

const router = express.Router();

// ─── Zod Validation Schemas ───────────────────────────────────────────────────
const razorpaySchema = z.object({
    amount: z.number().positive(),
    currency: z.string().optional(),
    receipt: z.string().optional(),
});

const orderSchema = z.object({
    items: z.array(
        z.object({
            productId: z.string(),
            quantity: z.number().positive(),
            price: z.number().positive(),
        })
    ),
    totalAmount: z.number().positive(),
    address: z.object({}),
    paymentMethod: z.string(),
    paymentId: z.string().optional(),
    razorpayOrderId: z.string().optional(),
});

// ─── Validation Middleware ────────────────────────────────────────────────────
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: "Validation failed", errors: result.error.errors });
    }
    req.body = result.data;
    next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// Razorpay
router.post("/razorpay/create", Authmiddleware, validate(razorpaySchema), createRazorpayOrder);

// Admin
router.get("/", getOrders);
router.patch("/:orderId/status", Authmiddleware, updateOrderStatus);

// User
router.get("/my-orders", Authmiddleware, getUserOrders);
router.get("/:orderId", Authmiddleware, getOrderById);
router.post("/ordercreate", Authmiddleware, validate(orderSchema), createOrder);
router.patch("/:orderId/cancel", Authmiddleware, cancelOrder);

export default router;