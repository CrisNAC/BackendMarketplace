import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";
import { approveStore, getPendingStores, rejectStore } from "./admin-stores.controller.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";

const router = Router();

// GET /api/admin/stores/pending — listar comercios pendientes de aprobación
router.get("/pending", authenticate, requireRole(ROLES.ADMIN), parsePagination, getPendingStores);

// PATCH /api/admin/stores/:id/approve — aprobar un comercio
router.patch("/:id/approve", authenticate, requireRole(ROLES.ADMIN), approveStore);

// PATCH /api/admin/stores/:id/reject — rechaza un comercio
router.patch("/:id/reject", authenticate, requireRole(ROLES.ADMIN), rejectStore);

export { router as adminStoresRoutes };
