import { Router } from "express";
import { registerUser } from "../controllers/users.controllers.js";

const router = Router();

// POST /api/users/register
router.post("/register", registerUser);

export default router;