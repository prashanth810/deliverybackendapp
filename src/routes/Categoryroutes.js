import express from "express";
import { getcategories, getProductsByCategory, createcategories, updatecategories, deletecategory } from "../controllers/CategoryController.js";
import Authmiddleware from "../middlewares/Authmiddleware.js";

const Categoryroute = express.Router();

Categoryroute.get("/categories", getcategories);
Categoryroute.get("/:id/products", getProductsByCategory);
Categoryroute.post("/create", createcategories);
Categoryroute.put("/:id", updatecategories);
Categoryroute.delete("/:id", deletecategory);


export default Categoryroute;