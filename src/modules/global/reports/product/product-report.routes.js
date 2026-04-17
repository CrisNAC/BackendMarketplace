import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { parsePagination } from "../../../../middlewares/pagination.middleware.js";
import { getProductsReports, updateProductReport, getProductsReportsFiltered } from "./product-report.controller.js";


const router = Router({ mergeParams: true });

// GET /api/reports/products - obtiene todos los reportes de productos (Admin) o los reportes de su tienda (Seller)
router.get("/products", authenticate, getProductsReports);
// GET /api/reports/products/filtered - obtiene reportes de productos filtrados (Admin y Seller)
router.get("/products/filtered", authenticate, parsePagination, getProductsReportsFiltered);
// PUT /api/reports/products/:reportId - actualiza el estado de un reporte de producto (Seller)
router.put("/products/:reportId", authenticate, updateProductReport);


export default router;