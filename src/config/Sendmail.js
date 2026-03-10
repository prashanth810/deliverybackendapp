import nodemailer from "nodemailer";
import { Envs } from "./Envs.js";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "pgrandmoms@gmail.com",
        pass: "qkcbhyukectaxtzs",
    },
});

export const sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Delivery App" <${Envs.EMAIL_USER}>`,
            to,
            subject,
            html,
        });

        console.log("Email sent:", info.messageId);
    } catch (error) {
        console.log("Mail error:", error.message);
        throw error;
    }
};