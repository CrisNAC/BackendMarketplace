import { Router } from "express";
import { 
    createProduct,
    getProductById,
    getProductsSearch,
} from "./product.controller.js";
import { 
    CreateProductDTO, 
    FilterProductDTO,
} from ".dtos/index";
import validate from "@/middlewares/validate.middleware.js";

const router = Router();

router.post("/", validate(CreateProductDTO), createProduct);
router.get("/:id", getProductById);
router.get("/", validate(FilterProductDTO, "query"), getProductsSearch);

export default router;
