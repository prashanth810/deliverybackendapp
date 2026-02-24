import express from "express";
import { getcategories, getProductsByCategory, createcategories, updatecategories, deletecategory } from "../controllers/CategoryController.js";
import Authmiddleware from "../middlewares/Authmiddleware.js";

const Categoryroute = express.Router();

Categoryroute.get("/categories", Authmiddleware, getcategories);
Categoryroute.get("/:id/products", Authmiddleware, getProductsByCategory);
Categoryroute.post("/create", Authmiddleware, createcategories);
Categoryroute.put("/:id", Authmiddleware, updatecategories);
Categoryroute.delete("/:id", Authmiddleware, deletecategory);


export default Categoryroute;