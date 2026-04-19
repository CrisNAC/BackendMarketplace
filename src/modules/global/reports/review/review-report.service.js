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

    const allowedReasons = ["SPAM", "INAPPROPRIATE_CONTENT", "FAKE_REVIEW", "OTHER"]; //razones permitidas
    if (!reason) throw new ValidationError("El motivo del reporte es obligatorio."); //verificar que se haya enviado un motivo
    if (!allowedReasons.includes(reason)) throw new ValidationError("Motivo no válido."); //verificar que el motivo sea valido

    //si el motivo es "OTHER", la descripción es obligatoria
    if (reason === "OTHER" && !description?.trim()) throw new ValidationError("Debés proporcionar una descripción para el motivo 'OTHER'.");

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