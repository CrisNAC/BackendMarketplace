import { Router } from "express";
import { 
    getProductReviews,
} from "./product-review.controller.js";
import { 
    GetReviewsDTO,
} from "./dtos/index";
import { validate } from "@/middlewares/validate.middleware.js";

const router = Router();

router.get("/:id", validate(GetReviewsDTO, "query"), getProductReviews);

export default router;