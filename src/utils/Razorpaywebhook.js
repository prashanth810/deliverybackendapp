import crypto from "crypto";
import OrderModel from "../models/OrderModel.js";
import { Envs } from "../config/Envs.js";

// ─── RAZORPAY WEBHOOK ─────────────────────────────────────────────────────────
// POST /api/v1/webhook
// ⚠️  Must use express.raw() middleware for this route (see app.js note below)
export const razorpayWebhook = async (req, res) => {
    try {
        const webhookSecret = Envs.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        // ✅ Step 1: Verify signature
        const shasum = crypto.createHmac("sha256", webhookSecret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest("hex");

        if (signature !== digest) {
            console.log("❌ Invalid Razorpay webhook signature");
            return res.status(400).end();
        }

        // ✅ Step 2: Handle events
        const event = req.body;

        switch (event.event) {

            // Payment success → update order status + save paymentId
            case "payment.captured": {
                const { order_id, id: payment_id } = event.payload.payment.entity;

                await OrderModel.findOneAndUpdate(
                    { razorpayOrderId: order_id },
                    {
                        paymentId: payment_id,
                        status: "Processing",   // Pending → Processing after payment
                    },
                    { new: true }
                );

                console.log(`✅ Payment captured for order: ${order_id}`);
                break;
            }

            // Payment failed → mark as Cancelled
            case "payment.failed": {
                const { order_id } = event.payload.payment.entity;

                await OrderModel.findOneAndUpdate(
                    { razorpayOrderId: order_id },
                    { status: "Cancelled" },
                    { new: true }
                );

                console.log(`❌ Payment failed for order: ${order_id}`);
                break;
            }

            default:
                console.log(`ℹ️  Unhandled Razorpay event: ${event.event}`);
        }

        res.status(200).end();

    } catch (error) {
        console.log("razorpayWebhook error:", error);
        res.status(500).end();
    }
};