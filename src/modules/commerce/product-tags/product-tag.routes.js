import { Router } from "express";
import { getProductTags } from "./product-tag.controller.js";

const router = Router();

router.get("/", getProductTags);

export default router;
