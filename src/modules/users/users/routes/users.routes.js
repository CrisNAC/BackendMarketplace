import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { registerUser, updateUser } from "../controllers/users.controllers.js";

const router = Router();

// POST /api/users/register
router.post("/register", registerUser);
router.put("/:id_user", authenticate, updateUser);

export default router;
