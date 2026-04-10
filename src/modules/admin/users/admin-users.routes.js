import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";
import { getUsers } from "./admin-users.controller.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";

const router = Router();

// GET /api/admin/users?search=&role=&status=&page=&limit=
router.get("/users", authenticate, requireRole(ROLES.ADMIN), parsePagination, getUsers);

export default router;