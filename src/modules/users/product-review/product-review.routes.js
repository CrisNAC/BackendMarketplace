// src/modules/users/product-reviews/product-review.routes.js
import { Router } from "express";
import { createProductReview } from "./product-review.controller.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { CreateProductReviewDTO } from "./dtos/create-product-review.dto.js";

const router = Router({ mergeParams: true });

router.post("/", validate(CreateProductReviewDTO), createProductReview);

export default router;