import { Router } from "express";
import { getProductReviews } from "./product-review.controller.js";

const router = Router();

router.get("/:id", getProductReviews);

export default router;