import express from "express";
import { z } from "zod";
import Authmiddleware from "../middlewares/Authmiddleware.js";
import {
    getOrders, createOrder, getUserOrders, getOrderById,
    updateOrderStatus, cancelOrder, createRazorpayOrder
} from "../controllers/OrdersController.js";

const Orderroutes = express.Router();

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
            name: z.string(),
            quantity: z.number().positive(),
            price: z.number().positive(),
        })
    ),
    totalAmount: z.number().positive(),
    address: z.object({               // ✅ fix: was z.object({}) which strips everything
        name: z.string(),
        mobile: z.string(),
        flatNo: z.string().optional(),
        buildingName: z.string().optional(),
        street: z.string().optional(),
        landmark: z.string().optional(),
        locality: z.string(),
        pincode: z.string(),
        type: z.string().optional(),
    }),
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
Orderroutes.post("/razorpay/create", Authmiddleware, validate(razorpaySchema), createRazorpayOrder);

// Admin
Orderroutes.get("/adminorders", getOrders);
Orderroutes.patch("/:orderId/status", Authmiddleware, updateOrderStatus);

// User
Orderroutes.get("/my-orders", Authmiddleware, getUserOrders);
Orderroutes.get("/orders/:orderId", getOrderById);
Orderroutes.post("/ordercreate", Authmiddleware, validate(orderSchema), createOrder);
Orderroutes.patch("/:orderId/cancel", Authmiddleware, cancelOrder);

export default Orderroutes;