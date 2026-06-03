import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { IdParamDTO } from "../../global/dtos/common/params.dto.js";
import { CreateProductReviewDTO } from "../../global/dtos/product-reviews/product-review.dto.js";
import { createProductReview } from "./product-review.controller.js";

const router = Router({ mergeParams: true });

router.post("/", authenticate, validate(IdParamDTO, "params"), validate(CreateProductReviewDTO, "body"), createProductReview);

export default router;