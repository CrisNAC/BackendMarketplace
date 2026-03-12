import { Router } from "express";
import { createProduct, getProductsSearch, getProductById} from "./product.controller.js";

const router = Router();

router.post("/", createProduct);
router.get("/", getProductsSearch);
router.get("/:id", getProductById);
export default router;
