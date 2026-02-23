import jwt from "jsonwebtoken";
import UserModel from "../models/UserModel.js";
import { Envs } from "../config/Envs.js";

const Authmiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
            });
        }

        const decoded = jwt.verify(token, Envs.JWT_SECRET);

        const user = await UserModel.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid token",
            });
        }

        req.user = user; // attach user to request

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }
};

export default Authmiddleware;