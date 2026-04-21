import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import { getProducts, updateProductStatus } from "./admin-products.controller.js";

const router = Router();

// GET  /api/admin/products?search=&approvalStatus=&page=&limit=
router.get("/", authenticate, requireRole(ROLES.ADMIN), parsePagination, getProducts);

// PATCH /api/admin/products/:id/status — body: { status: "ACTIVE"|"REJECTED", reason? }
router.patch("/:id/status", authenticate, requireRole(ROLES.ADMIN), updateProductStatus);

export { router as adminProductsRoutes };