import { prisma } from "../../../lib/prisma.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError
} from "../../../lib/errors.js";
import { parsePositiveInteger } from "../../../lib/validators.js";


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

  // Notas obligatorias al cerrar el reporte
  if (["RESOLVED", "REJECTED"].includes(report_status) && !notes?.trim()) {
    throw new ValidationError(
      report_status === "RESOLVED"
        ? "Debés agregar una nota explicando cómo se resolvió el reclamo"
        : "Debés agregar una nota explicando por qué se rechazó el reclamo"
    );
  }

  const isClosed = ["RESOLVED", "REJECTED"].includes(report_status);

  const updatedReport = await prisma.productReports.update({
    where: { id_product_report: resolvedReportId },
    data: {
      report_status,
      ...(notes && { notes: notes.trim() }),
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

  return updatedReport;
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