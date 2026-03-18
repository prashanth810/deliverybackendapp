import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import Razorpay from "razorpay";
import { Envs } from "../config/Envs.js";
import ProductModel from "../models/ProductModel.js";
import OrderModel from "../models/OrderModel.js";

// ─── Razorpay Instance ────────────────────────────────────────────────────────
const razorpayInstance = new Razorpay({
    key_id: Envs.RAZORPAY_KEY,
    key_secret: Envs.RAZORPAY_SECRET_KEY,
});

// ─── Helper: Send Email With Retry ───────────────────────────────────────────
const sendEmailWithRetry = async (mailOptions, retries = 3) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: Envs.EMAIL_USER,
            pass: Envs.EMAIL_PASS,
        },
    });

    for (let i = 0; i < retries; i++) {
        try {
            await transporter.sendMail(mailOptions);
            return;
        } catch (err) {
            if (i === retries - 1) throw err;
        }
    }
};

// ─── Helper: Generate PDF Invoice Buffer ─────────────────────────────────────
const generateInvoicePDF = (order, address) => {
    return new Promise((resolve, reject) => {
        const pdfDoc = new PDFDocument();
        const buffers = [];

        pdfDoc.on("data", (chunk) => buffers.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(buffers)));
        pdfDoc.on("error", reject);

        pdfDoc.fontSize(20).text("Invoice", { align: "center" });
        pdfDoc.fontSize(12).text(`Order ID: ${order._id}`);
        pdfDoc.text(`Date: ${new Date().toLocaleDateString()}`);
        pdfDoc.moveDown();
        pdfDoc.text("Items:");

        order.items.forEach((item) => {
            pdfDoc.text(`${item.quantity} x ${item.name} - ₹${item.price}`);
        });

        pdfDoc.moveDown();
        pdfDoc.text(`Total: ₹${order.totalAmount}`, { align: "right" });
        pdfDoc.text(`Payment Method: ${order.paymentMethod}`);
        pdfDoc.moveDown();
        pdfDoc.text("Delivery Address:");
        pdfDoc.text(`${address.name}`);
        pdfDoc.text(`${address.flatNo}, ${address.buildingName}`);
        pdfDoc.text(`${address.locality} - ${address.pincode}`);

        pdfDoc.end();
    });
};

// ─── RAZORPAY: Create Razorpay Order ─────────────────────────────────────────
export const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency = "INR", receipt } = req.body;

        const options = {
            amount: amount * 100,
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);

        res.status(200).json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
        });
    } catch (error) {
        console.log("createRazorpayOrder error:", error);
        res.status(500).json({ message: "Failed to create Razorpay order" });
    }
};

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────
export const createOrder = async (req, res) => {
    try {
        const {
            items,
            totalAmount,
            address,
            paymentMethod,
            paymentId,
            razorpayOrderId,
        } = req.body;

        const userId = req.user._id;

        // ✅ Check required address fields before hitting DB
        if (!address?.name || !address?.mobile || !address?.pincode || !address?.locality) {
            return res.status(400).json({
                message: "Missing required address fields",
                received: address,
            });
        }

        // ✅ Validate stock for each item
        for (const item of items) {
            let product;
            try {
                product = await ProductModel.findById(item.productId);
            } catch (e) {
                return res.status(400).json({ message: `Invalid productId format: ${item.productId}` });
            }

            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.productId}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }
        }

        // ✅ Deduct stock
        for (const item of items) {
            await ProductModel.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity },
            });
        }

        // ✅ Create order in DB
        const order = await OrderModel.create({
            userId,
            items,
            totalAmount,
            address,
            paymentMethod,
            paymentId: paymentId || null,
            razorpayOrderId: razorpayOrderId || null,
        });

        console.log("✅ Order created:", order._id);

        // ✅ Generate PDF & send email (non-blocking)
        try {
            const pdfBuffer = await generateInvoicePDF(order, address);
            const mailOptions = {
                from: Envs.EMAIL_USER,
                to: req.user.email,
                subject: `Order Confirmed - #${order._id}`,
                text: `Hi ${address.name}, your order has been placed successfully!`,
                attachments: [
                    {
                        filename: `invoice_${order._id}.pdf`,
                        content: pdfBuffer,
                        contentType: "application/pdf",
                    },
                ],
            };
            sendEmailWithRetry(mailOptions).catch((error) =>
                console.log("Failed to send order email after retries:", error)
            );
        } catch (pdfError) {
            console.log("Failed to generate invoice PDF:", pdfError);
        }

        res.status(201).json({ message: "Order placed successfully", order });

    } catch (error) {
        // ✅ Mongoose ValidationError — shows exactly which field failed
        if (error.name === "ValidationError") {
            const fields = Object.keys(error.errors).map((key) => ({
                field: key,
                message: error.errors[key].message,
            }));
            console.log("❌ Mongoose Validation Errors:", fields);
            return res.status(400).json({ message: "Validation failed", errors: fields });
        }

        // ✅ Mongoose CastError — wrong ObjectId format
        if (error.name === "CastError") {
            console.log("❌ CastError on field:", error.path);
            return res.status(400).json({ message: `Invalid value for field: ${error.path}` });
        }

        // ✅ Any other error — show exact message
        console.log("❌ createOrder error:", error.message);
        console.log("❌ createOrder stack:", error.stack);
        res.status(500).json({ message: error.message });
    }
};

// ─── GET ALL ORDERS (Admin) ───────────────────────────────────────────────────
export const getOrders = async (req, res) => {
    try {
        const orders = await OrderModel.find()
            .populate("userId", "name email")
            .populate("items.productId", "name price imageurl")
            .sort({ createdAt: -1 });

        res.status(200).json({ orders });
    } catch (error) {
        console.log("getOrders error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ─── GET MY ORDERS (User) ─────────────────────────────────────────────────────
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;

        const orders = await OrderModel.find({ userId })
            .populate("items.productId", "name price imageurl")
            .sort({ createdAt: -1 });

        res.status(200).json({ orders });
    } catch (error) {
        console.log("getUserOrders error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ─── GET SINGLE ORDER ─────────────────────────────────────────────────────────
export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await OrderModel.findById(orderId)
            .populate("userId", "name email")
            .populate("items.productId", "name price imageurl");

        if (!order) return res.status(404).json({ message: "Order not found" });

        res.status(200).json({ order });
    } catch (error) {
        console.log("getOrderById error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ─── UPDATE ORDER STATUS (Admin) ──────────────────────────────────────────────
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const order = await OrderModel.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );

        if (!order) return res.status(404).json({ message: "Order not found" });

        res.status(200).json({ message: "Order status updated", order });
    } catch (error) {
        console.log("updateOrderStatus error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ─── CANCEL ORDER (User) ──────────────────────────────────────────────────────
export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const order = await OrderModel.findOne({ _id: orderId, userId });

        if (!order) return res.status(404).json({ message: "Order not found" });

        if (["Shipped", "Delivered"].includes(order.status)) {
            return res.status(400).json({ message: "Cannot cancel order at this stage" });
        }

        for (const item of order.items) {
            await ProductModel.findByIdAndUpdate(item.productId, {
                $inc: { stock: item.quantity },
            });
        }

        order.status = "Cancelled";
        await order.save();

        res.status(200).json({ message: "Order cancelled successfully", order });
    } catch (error) {
        console.log("cancelOrder error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};