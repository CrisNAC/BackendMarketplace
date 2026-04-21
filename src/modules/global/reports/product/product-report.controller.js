import {
  getProductsReportsService,
  updateProductReportService,
  getProductsReportsFilteredService,
  getProductReportReasonsService,
  createProductReportService,
  checkProductReportService,
  resolveProductReportAdminService,
} from "./product-report.service.js";

/**
 * GET /api/reports/products
 * Admin obtiene todos los reportes de productos.
 * Seller obtiene los reportes de su tienda.
 */
export const getProductsReports = async (req, res, next) => {
    try {
        if (!req.user?.id_user) {
            return res.status(401).json({
                success: false,
                message: "Usuario autenticado requerido"
            });
        }
        const productsReports = await getProductsReportsService(req.user.id_user);
        return res.status(200).json({ productsReports });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/reports/products/:reportId
 * Solo el Seller puede actualizar el estado de un reporte de producto (IN_PROGRESS o RESOLVED)
 * y agregar notas explicativas. No puede modificar un reporte ya resuelto o rechazado.
 * Body: { report_status, notes }
 */
export const updateProductReport = async (req, res, next) => {
    try {
        if (!req.user?.id_user) {
            return res.status(401).json({
                success: false,
                message: "Usuario autenticado requerido"
            });
        }

        const { reportId } = req.params;
        const { report_status, notes } = req.body;

        const updatedReport = await updateProductReportService(req.user.id_user, reportId, { report_status, notes });

        return res.status(200).json({ updatedReport });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/reports/products/filtered
 * Admin y Seller pueden obtener reportes de productos filtrados por estado del reporte y búsqueda por nombre del cliente que reportó.
 * El Seller solo ve los reportes de su tienda.
 * Query params: report_status (opcional), search (opcional), page (opcional, default 1), limit (opcional, default 10)
 */
export const getProductsReportsFiltered = async (req, res, next) => {
    try {
        if (!req.user?.id_user) {
            return res.status(401).json({
                success: false,
                message: "Usuario autenticado requerido"
            });
        }

        const { report_status, search } = req.query;

        const filteredReports = await getProductsReportsFilteredService(req.user.id_user, { report_status, search }, req.pagination);
        return res.status(200).json({ filteredReports });
    } catch (error) {
        next(error);
    }
}

export const getProductReportReasons = (_req, res) => {
  return res.status(200).json(getProductReportReasonsService());
};

export const createProductReport = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({ success: false, message: "Usuario autenticado requerido" });
    }
    const { productId, reason, description } = req.body;
    const report = await createProductReportService(req.user.id_user, { productId, reason, description });
    return res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

export const checkProductReport = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({ success: false, message: "Usuario autenticado requerido" });
    }
    const { productId } = req.query;
    const result = await checkProductReportService(req.user.id_user, productId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resolveProductReport = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({ success: false, message: "Usuario autenticado requerido" });
    }
    const { status, notes } = req.body;
    const result = await resolveProductReportAdminService(req.user.id_user, req.params.reportId, { status, notes });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};