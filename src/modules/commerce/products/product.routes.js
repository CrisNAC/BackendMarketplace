import { Router } from "express";
import { createProduct } from "./product.controller.js";

const router = Router();

router.post("/", createProduct);

export default router;
