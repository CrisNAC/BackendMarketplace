import { Router } from "express";
import { createProduct, getProductsSearch } from "./product.controller.js";

const router = Router();

router.post("/", createProduct);
router.get("/", getProductsSearch);

export default router;
