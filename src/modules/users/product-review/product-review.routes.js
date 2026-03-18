import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { createProductReview } from "./product-review.controller.js";

const router = Router({ mergeParams: true });

router.post("/", authenticate, createProductReview);

export default router;