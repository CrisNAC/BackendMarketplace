import { Router } from "express";
import { createProductReview } from "./product-review.controller.js";

const router = Router({ mergeParams: true });

router.post("/", createProductReview);

export default router;