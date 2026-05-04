//distance.routes.js
import { Router } from "express";
import { getDistance } from "../controllers/distance.controller.js";

const router = Router();

router.post("/", getDistance);

export default router;