import { Router } from "express";
import { getProductCategories } from "./product-category.controller.js";

const router = Router();

router.get("/", getProductCategories);

export default router;
