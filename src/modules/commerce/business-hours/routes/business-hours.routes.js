import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import {
  getStoreBusinessHours,
  updateStoreBusinessHours,
} from "../controllers/business-hours.controllers.js";

const router = Router();

router.get("/:id/business-hours", getStoreBusinessHours);
router.put("/:id/business-hours", authenticate, updateStoreBusinessHours);

export default router;
