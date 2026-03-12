import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { updateAddress } from "../controllers/addresses.controllers.js";

const router = Router();

router.put("/:id_user/addresses/:id_address", authenticate, updateAddress);

export default router;
