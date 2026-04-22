import { prisma } from "../../../../lib/prisma.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError
} from "../../../../lib/errors.js";
import { parsePositiveInteger } from "../../../../lib/validators.js";

// Catálogo de motivos de reporte. Es la fuente única de verdad:
// se usa para validar en createProductReportService y se expone vía GET /reasons para el frontend.
export const PRODUCT_REPORT_REASONS = [
  { value: "DEFECTIVE",        label: "Producto en mal estado" },
  { value: "WRONG_ITEM",       label: "Producto incorrecto o no es lo que pedí" },
  { value: "MISSING_ITEM",     label: "Producto incompleto o faltante" },
  { value: "LATE_DELIVERY",    label: "Entrega tardía o no recibida" },
  { value: "CUSTOMER_SERVICE", label: "Mala atención del vendedor" },
  { value: "OTHER",            label: "Otro" },
];

const BASE_QUERY = {
  where: { status: true },
  orderBy: { created_at: "desc" },
  select: {
    id_product_report: true,
    reason: true,
    description: true,
    report_status: true,
    notes: true,
    created_at: true,
    resolved_at: true,
    reporter: {
      select: {
        id_user: true,
        name: true,
        email: true,
        phone: true,
      },
    },
    product: {
      select: {
        id_product: true,
        name: true,
        store: {
          select: {
            id_store: true,
            name: true,
          },
        },
      },
    },
    order: {
      select: {
        id_order: true,
        created_at: true,
      },
    },
  },
};

// Admin obtiene todos los reportes de productos. Seller obtiene los reportes de su tienda.
export const getProductsReportsService = async (authenticatedUserId) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");

  const user = await prisma.users.findUnique({
    where: { id_user: resolvedUserId },
    select: { role: true },
  });

  if (!user) throw new NotFoundError("Usuario no encontrado");


  let productsReports;

  if (user.role === "ADMIN") {
    // el Admin ve todos los reportes de productos
    productsReports = await prisma.productReports.findMany(BASE_QUERY);

  } else if (user.role === "SELLER") {
    // el Seller solo ve los reportes de su tienda
    const store = await prisma.stores.findUnique({
      where: { fk_user: resolvedUserId },
      select: { id_store: true },
    });

    if (!store) throw new NotFoundError("No se encontró un comercio asociado a este usuario");

    productsReports = await prisma.productReports.findMany({
      ...BASE_QUERY,
      where: {
        ...BASE_QUERY.where,
        product: {
          fk_store: store.id_store,
        },
      },
    });

  } else {
    throw new ForbiddenError("No tenés permiso para acceder a este recurso");
  }

  return productsReports;
};


// Solo el Seller puede actualizar el estado de un reporte de producto (IN_PROGRESS o RESOLVED)
// y agregar notas explicativas. No puede modificar un reporte ya resuelto o rechazado.
export const updateProductReportService = async (authenticatedUserId, reportId, { report_status, notes }) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedReportId = parsePositiveInteger(reportId, "reportId");

  const user = await prisma.users.findUnique({// obtenemos el usuario para verificar que es seller y obtener su tienda
    where: { id_user: resolvedUserId },
    select: { role: true },
  });

  if (!user) throw new NotFoundError("Usuario no encontrado");
  if (user.role !== "SELLER") throw new ForbiddenError("No tenés permiso para realizar esta acción");

  const store = await prisma.stores.findUnique({
    where: { fk_user: resolvedUserId },
    select: { id_store: true },
  });

  if (!store) throw new NotFoundError("No se encontró un comercio asociado a este usuario");

  const report = await prisma.productReports.findFirst({
    where: {
      id_product_report: resolvedReportId,
      status: true,
      product: {
        fk_store: store.id_store,
      },
    },
  });

  if (!report) throw new NotFoundError("Reporte no encontrado");

  // No se puede modificar un reporte ya cerrado
  if (report.report_status === "RESOLVED" || report.report_status === "REJECTED")
    throw new ValidationError("Este reporte ya fue cerrado y no puede modificarse");

  // Validar transiciones permitidas
  // PENDING -> IN_PROGRESS
  // IN_PROGRESS -> RESOLVED
  // IN_PROGRESS -> REJECTED
  const allowedTransitions = {
    PENDING: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED", "REJECTED"],
  };

  const currentStatus = report.report_status; // estado actual del reporte
  const allowed = allowedTransitions[currentStatus]; // estados permitidos para el siguiente estado

  // si el nuevo estado no esta en los permitidos, lanza error
  if (!allowed.includes(report_status)) {
    throw new ValidationError(
      `No podés pasar de ${currentStatus} a ${report_status}. Transiciones permitidas: ${allowed.join(", ")}`
    );
  }

  //validar que las notas sean texto
  if (notes !== undefined && notes !== null && typeof notes !== "string")
    throw new ValidationError("Las notas deben ser texto.")

  const trimmedNotes = notes?.trim();

  // Notas obligatorias al cerrar el reporte
  if (["RESOLVED", "REJECTED"].includes(report_status) && !trimmedNotes) {
    throw new ValidationError(
      report_status === "RESOLVED"
        ? "Debés agregar una nota explicando cómo se resolvió el reclamo"
        : "Debés agregar una nota explicando por qué se rechazó el reclamo"
    );
  }

  const isClosed = ["RESOLVED", "REJECTED"].includes(report_status);

  let updatedReport;
  try {
    updatedReport = await prisma.productReports.update({
      where: {
        id_product_report: resolvedReportId,
        status: true,
        report_status: currentStatus,
        product: { fk_store: store.id_store },
      },
      data: {
        report_status,
        ...(trimmedNotes && { notes: trimmedNotes }),
        ...(isClosed && {
          resolved_by: resolvedUserId,
          resolved_at: new Date(),
        }),
      },
      select: {
        id_product_report: true,
        report_status: true,
        notes: true,
        resolved_at: true,
        resolver: {
          select: {
            id_user: true,
            name: true,
          },
        },
      },
    });
  } catch (e) {
    if (e?.code === "P2025") {
      throw new NotFoundError("El reporte ya no está disponible o fue modificado por otro proceso");
    }
    throw e;
  }

  return updatedReport;
};

// Devuelve el catálogo de motivos válidos con sus etiquetas en español.
export const getProductReportReasonsService = () => PRODUCT_REPORT_REASONS;

// Cliente crea un reporte de producto. No puede duplicar un reporte PENDING para el mismo producto.
export const createProductReportService = async (authenticatedUserId, { productId, reason, description }) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedProductId = parsePositiveInteger(productId, "productId");

  if (!reason || typeof reason !== "string" || !reason.toString().trim()) {
    throw new ValidationError("La razón del reporte es requerida");
  }

  const normalizedReason = reason.toString().trim().toUpperCase();
  const allowedValues = PRODUCT_REPORT_REASONS.map((r) => r.value);
  if (!allowedValues.includes(normalizedReason)) {
    throw new ValidationError(`Razón inválida. Los valores permitidos son: ${allowedValues.join(", ")}`);
  }

  const product = await prisma.products.findFirst({
    where: { id_product: resolvedProductId, status: true },
    select: { id_product: true },
  });
  if (!product) throw new NotFoundError("Producto no encontrado");

  const existing = await prisma.productReports.findFirst({
    where: {
      fk_product: resolvedProductId,
      fk_reporter: resolvedUserId,
      report_status: "PENDING",
      status: true,
    },
    select: { id_product_report: true },
  });
  if (existing) throw new ConflictError("Ya tenés un reporte pendiente para este producto");

  const trimmedDescription = description?.toString().trim() || null;

  const report = await prisma.productReports.create({
    data: {
      fk_product: resolvedProductId,
      fk_reporter: resolvedUserId,
      reason: normalizedReason,
      description: trimmedDescription,
    },
    select: {
      id_product_report: true,
      reason: true,
      description: true,
      report_status: true,
      created_at: true,
    },
  });

  return report;
};

// Cliente verifica si ya tiene un reporte PENDING para un producto dado.
export const checkProductReportService = async (authenticatedUserId, productId) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedProductId = parsePositiveInteger(productId, "productId");

  const existing = await prisma.productReports.findFirst({
    where: {
      fk_product: resolvedProductId,
      fk_reporter: resolvedUserId,
      report_status: "PENDING",
      status: true,
    },
    select: { id_product_report: true },
  });

  return { hasReport: !!existing, reportId: existing?.id_product_report ?? null };
};

// Endpoint para que Admin y Seller puedan obtener reportes de productos filtrados por estado del reporte
// y búsqueda por nombre del cliente que reportó. El Seller solo ve los reportes de su tienda.
export const getProductsReportsFilteredService = async (authenticatedUserId, { report_status, search }, { page, limit, skip }) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");

  const user = await prisma.users.findUnique({// verifica que el user es admin o seller
    where: { id_user: resolvedUserId },
    select: { role: true },
  });

  if (!user) throw new NotFoundError("Usuario no encontrado");
  if (!["ADMIN", "SELLER"].includes(user.role)) throw new ForbiddenError("No tenés permiso para acceder a este recurso");

  // Validar report_status si viene
  const allowedStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];
  if (report_status && !allowedStatuses.includes(report_status)) {
    throw new ValidationError(
      `Estado inválido. Los valores permitidos son: ${allowedStatuses.join(", ")}`
    );
  }

  // Filtro base
  const where = {
    status: true,
    ...(report_status && { report_status }),
    // Búsqueda por nombre del cliente que reportó
    ...(search && {
      reporter: {
        name: { contains: search, mode: "insensitive" },
      },
    }),
  };

  // Si es seller, restringir a su tienda
  if (user.role === "SELLER") {
    const store = await prisma.stores.findUnique({
      where: { fk_user: resolvedUserId },
      select: { id_store: true },
    });

    if (!store) throw new NotFoundError("No se encontró un comercio asociado a este usuario");

    where.product = { fk_store: store.id_store };
  }

  const select = BASE_QUERY.select;

  // Ejecutar query y conteo en paralelo
  const [reports, total] = await Promise.all([
    prisma.productReports.findMany({
      where,
      select,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.productReports.count({ where }),
  ]);

  return {
    data: reports,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
};

// Admin resuelve o rechaza un reporte de producto.
export const resolveProductReportAdminService = async (adminUserId, reportId, { status, notes }) => {
  const resolvedAdminId = parsePositiveInteger(adminUserId, "userId");
  const resolvedReportId = parsePositiveInteger(reportId, "reportId");

  if (!status || typeof status !== "string" || !status.toString().trim()) {
    throw new ValidationError("El estado es requerido");
  }

  const normalizedStatus = status.toString().trim().toUpperCase();
  const allowedStatuses = ["RESOLVED", "REJECTED"];
  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new ValidationError(`Estado inválido. Los valores permitidos son: ${allowedStatuses.join(", ")}`);
  }

  const trimmedNotes = notes?.toString().trim();
  if (!trimmedNotes) {
    throw new ValidationError("Las notas son obligatorias al resolver o rechazar un reporte");
  }

  const report = await prisma.productReports.findFirst({
    where: { id_product_report: resolvedReportId, status: true },
    select: { id_product_report: true, report_status: true },
  });

  if (!report) throw new NotFoundError("Reporte no encontrado");

  if (report.report_status === "RESOLVED" || report.report_status === "REJECTED") {
    throw new ValidationError("Este reporte ya fue cerrado y no puede modificarse");
  }

  let updated;
  try {
    updated = await prisma.productReports.update({
      where: { id_product_report: resolvedReportId, status: true },
      data: {
        report_status: normalizedStatus,
        notes: trimmedNotes,
        resolved_by: resolvedAdminId,
        resolved_at: new Date(),
      },
      select: {
        id_product_report: true,
        report_status: true,
        notes: true,
        resolved_at: true,
        resolver: { select: { id_user: true, name: true } },
      },
    });
  } catch (e) {
    if (e?.code === "P2025") throw new NotFoundError("El reporte ya no está disponible o fue modificado por otro proceso");
    throw e;
  }

  return updated;
};