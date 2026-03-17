import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
  createProduct,
  getProductsSearch,
  getProductById,
  updateProduct,
  deleteProduct
} from "./product.controller.js";

const router = Router();

router.post("/", authenticate, createProduct);
router.put("/:id", authenticate, updateProduct);
router.delete("/:id", authenticate, deleteProduct);
router.get("/", getProductsSearch);
router.get("/:id", getProductById);

export default router;
