import { prisma } from "../../../lib/prisma.js";

export const getProductReviewsService = async (productId, query) => {
    const id = Number(productId);
    if (!Number.isInteger(id) || id <= 0) {
        throw { status: 400, message: "ID de producto inválido" };
    }

    // Paginación
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;

    // Verificar que el producto exista
    const product = await prisma.products.findUnique({
        where: { id_product: id },
        select: { id_product: true, status: true }
    });

    if (!product || !product.status) {
        throw { status: 404, message: "Producto no encontrado" };
    }

    // Obtener reseñas y stats en paralelo
    const [reviews, allRatings] = await Promise.all([
        prisma.productReviews.findMany({
            where: { fk_product: id, status: true },
            skip,
            take: limit,
            orderBy: { created_at: "desc" },
            select: {
                id_product_review: true,
                rating: true,
                comment: true,
                approved: true,
                created_at: true,
                user: {
                    select: { name: true }
                }
            }
        }),
        prisma.productReviews.findMany({
            where: { fk_product: id, status: true },
            select: { rating: true, approved: true }
        })
    ]);

    const totalReviews = allRatings.length;
    const verifiedReviews = allRatings.filter((r) => r.approved).length;
    const averageRating =
        totalReviews > 0
            ? Number(
                (allRatings.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
            )
            : null;

    return {
        stats: {
            averageRating,
            totalReviews,
            verifiedReviews
        },
        pagination: {
            page,
            limit,
            totalReviews,
            totalPages: Math.ceil(totalReviews / limit)
        },
        reviews: reviews.map((r) => ({
            id: r.id_product_review,
            customerName: r.user.name,
            rating: r.rating,
            comment: r.comment,
            date: r.created_at,
            isVerified: r.approved
        }))
    };
};