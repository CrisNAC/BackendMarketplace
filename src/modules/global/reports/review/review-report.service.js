import { prisma } from "../../../../lib/prisma.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError
} from "../../../../lib/errors.js";
import { parsePositiveInteger } from "../../../../lib/validators.js";


export const reportProductReviewService = async (authenticatedUserId, reviewId, { reason, description }) => {
    const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
    const resolvedReviewId = parsePositiveInteger(reviewId, "reviewId");

    const allowedReasons = ["SPAM", "OFFENSIVE", "FAKE", "OTHER"]; //razones permitidas
    if (!reason) throw new ValidationError("El motivo del reporte es obligatorio."); //verificar que se haya enviado un motivo
    if (!allowedReasons.includes(reason)) throw new ValidationError("Motivo no válido."); //verificar que el motivo sea valido

    //si el motivo es "OTHER", la descripción es obligatoria
    if (reason === "OTHER" && !description?.trim()) throw new ValidationError("Debés proporcionar una descripción para el motivo 'OTHER'.");
    
    const user = await prisma.users.findUnique({//verificar que el user existe
        where: { id_user: resolvedUserId },
        select: { id_user: true }
    });
    if (!user) throw new NotFoundError("Usuario no encontrado.");

    const review = await prisma.productReviews.findFirst({//verificar que la reseña existe y está activa
        where: { id_product_review: resolvedReviewId, status: true },
        select: { id_product_review: true, fk_user: true }
    });
    if (!review) throw new NotFoundError("Reseña no encontrada.");

    if (review.fk_user === resolvedUserId) throw new ForbiddenError("No podés reportar tu propia reseña.");

    const existingReport = await prisma.reviewReports.findUnique({//verificar que el user no haya reportado esta reseña antes
        where: {
            fk_product_review_fk_reporter: {
                fk_product_review: resolvedReviewId,
                fk_reporter: resolvedUserId,
            },
        },
    });
    if (existingReport) throw new ConflictError("Ya has reportado esta reseña.");


    const report = await prisma.reviewReports.create({
        data: {
            fk_product_review: resolvedReviewId,
            fk_reporter: resolvedUserId,
            reason,
            ...(description && { description: description.trim() }),
        },
        select: {
            id_review_report: true,
            reason: true,
            description: true,
            report_status: true,
            created_at: true
        }
    });

    return report;
};

const BASE_SELECT = {
  id_review_report: true,
  reason: true,
  description: true,
  report_status: true,
  created_at: true,
  resolved_at: true,
  reporter: {
    select: {
      id_user: true,
      name: true,
      email: true,
    },
  },
  resolver: {
    select: {
      id_user: true,
      name: true,
    },
  },
  product_review: {
    select: {
      id_product_review: true,
      rating: true,
      comment: true,
      status: true,
      created_at: true,
      user: {
        select: { id_user: true, name: true },
      },
      product: {
        select: {
          id_product: true,
          name: true,
          store: {
            select: { id_store: true, name: true },
          },
        },
      },
    },
  },
};

/** Solo ADMIN: reportes sobre reseñas de producto (usuarios que denunciaron una reseña). */
export const getReviewReportsFilteredService = async (
  authenticatedUserId,
  { report_status, search },
  { page, limit, skip }
) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");

  const user = await prisma.users.findUnique({
    where: { id_user: resolvedUserId },
    select: { role: true },
  });

  if (!user) throw new NotFoundError("Usuario no encontrado");
  if (user.role !== "ADMIN")
    throw new ForbiddenError("No tenés permiso para acceder a este recurso");

  const allowedStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];
  if (report_status && !allowedStatuses.includes(report_status)) {
    throw new ValidationError(
      `Estado inválido. Los valores permitidos son: ${allowedStatuses.join(", ")}`
    );
  }

  const where = {
    status: true,
    ...(report_status && { report_status }),
    ...(search?.trim() && {
      OR: [
        {
          reporter: {
            name: { contains: search.trim(), mode: "insensitive" },
          },
        },
        {
          product_review: {
            product: {
              name: { contains: search.trim(), mode: "insensitive" },
            },
          },
        },
        {
          product_review: {
            user: {
              name: { contains: search.trim(), mode: "insensitive" },
            },
          },
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.reviewReports.findMany({
      where,
      select: BASE_SELECT,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.reviewReports.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 0,
    },
  };
};

const CLOSED = ["RESOLVED", "REJECTED"];

/**
 * decision: KEEP_REVIEW — el reporte no procede; la reseña sigue visible (reporte REJECTED).
 * decision: REMOVE_REVIEW — se oculta la reseña; reporte(s) abierto(s) de esa reseña → RESOLVED.
 */
export const resolveReviewReportService = async (
  authenticatedUserId,
  reportId,
  { decision }
) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedReportId = parsePositiveInteger(reportId, "reportId");

  if (!["KEEP_REVIEW", "REMOVE_REVIEW"].includes(decision)) {
    throw new ValidationError(
      "decision debe ser KEEP_REVIEW o REMOVE_REVIEW"
    );
  }

  const user = await prisma.users.findUnique({
    where: { id_user: resolvedUserId },
    select: { role: true },
  });

  if (!user) throw new NotFoundError("Usuario no encontrado");
  if (user.role !== "ADMIN")
    throw new ForbiddenError("No tenés permiso para realizar esta acción");

  const report = await prisma.reviewReports.findFirst({
    where: {
      id_review_report: resolvedReportId,
      status: true,
    },
    select: {
      id_review_report: true,
      report_status: true,
      fk_product_review: true,
    },
  });

  if (!report) throw new NotFoundError("Reporte no encontrado");

  if (CLOSED.includes(report.report_status)) {
    throw new ValidationError("Este reporte ya fue cerrado");
  }

  const reviewId = report.fk_product_review;

  if (decision === "KEEP_REVIEW") {
    const updated = await prisma.reviewReports.update({
      where: { id_review_report: resolvedReportId },
      data: {
        report_status: "REJECTED",
        resolved_by: resolvedUserId,
        resolved_at: new Date(),
      },
      select: BASE_SELECT,
    });
    return { updatedReport: updated };
  }

  await prisma.$transaction(async (tx) => {
    await tx.productReviews.update({
      where: { id_product_review: reviewId },
      data: { status: false },
    });

    await tx.reviewReports.updateMany({
      where: {
        fk_product_review: reviewId,
        status: true,
        report_status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      data: {
        report_status: "RESOLVED",
        resolved_by: resolvedUserId,
        resolved_at: new Date(),
      },
    });
  });

  const updated = await prisma.reviewReports.findFirst({
    where: { id_review_report: resolvedReportId },
    select: BASE_SELECT,
  });

  return { updatedReport: updated };
};