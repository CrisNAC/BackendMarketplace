import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { registerUser, updateUser, updateUserPassword, getUserProfile } from "../controllers/users.controllers.js";

const router = Router();

// POST /api/users/register
router.post("/register", registerUser);
router.put("/:id_user", authenticate, updateUser);
router.put("/:id_user/password", authenticate, updateUserPassword);
router.get("/:id_user", authenticate, getUserProfile);

export default router;
