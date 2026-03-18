import { Router } from "express";
import { getStoreCategories } from "./store-category.controller.js";

const router = Router();

router.get("/", getStoreCategories);

export default router;
