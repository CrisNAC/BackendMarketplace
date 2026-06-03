//users.routes.js
import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { passwordResetRateLimiter } from "../../../../middlewares/rateLimiter.js";
import {
    registerUser,
    updateUser,
    updateUserPassword,
    getUserProfile,
    requestPasswordReset,
    validateResetToken,
    resetPassword,
} from "../controllers/users.controllers.js";

const router = Router();

router.post("/register", registerUser);

// Password reset (sin autenticación)
router.post("/forgot-password", passwordResetRateLimiter, requestPasswordReset);
router.post("/validate-reset-token", validateResetToken);
router.post("/reset-password", resetPassword);

router.put("/:id_user", authenticate, updateUser);
router.put("/:id_user/password", authenticate, updateUserPassword);
router.get("/:id_user", authenticate, getUserProfile);
export default router;