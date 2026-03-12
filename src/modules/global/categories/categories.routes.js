import { Router } from "express";
import productCategoryRoutes from "./product-categories/product-category.routes.js";
import storeCategoryRoutes from "./store-categories/store-category.routes.js";

const router = Router();

router.use("/products", productCategoryRoutes);
router.use("/stores", storeCategoryRoutes);

export default router;
