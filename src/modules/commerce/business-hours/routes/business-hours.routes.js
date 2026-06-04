import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { validate } from "../../../../middlewares/validate.middleware.js";
import {
  getStoreBusinessHours,
  updateStoreBusinessHours,
} from "../controllers/business-hours.controllers.js";
import { IdParamDTO } from "../../../global/dtos/common/params.dto.js";
import { UpdateBusinessHoursDTO } from "../../../global/dtos/business-hours/business-hours.dto.js";

const router = Router();

router.get("/:id/business-hours", getStoreBusinessHours);
router.put("/:id/business-hours", authenticate, validate(IdParamDTO, "params"), validate(UpdateBusinessHoursDTO, "body"), updateStoreBusinessHours);

export default router;
