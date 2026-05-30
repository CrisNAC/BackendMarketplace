import { prisma } from "../../../lib/prisma.js";

const parsePositiveInteger = (value, fieldName) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw { status: 400, message: `${fieldName} inválido` };
    }
    return parsed;
};

export const getStoreDashboardService = async (storeId) => {
    const id = parsePositiveInteger(storeId, "ID de comercio");

    const store = await prisma.stores.findUnique({
        where: { id_store: id },
        select: { id_store: true, status: true }
    });

    if (!store || !store.status) {
        throw { status: 404, message: "Comercio no encontrado" };
    }

    // Productos del comercio activos
    const storeProducts = await prisma.products.findMany({
        where: { fk_store: id, status: true },
        select: { id_product: true }
    });

    const productIds = storeProducts.map(p => p.id_product);

    if (productIds.length === 0) {
        return {
            stats: {
                activeProducts: 0,
                averageRating: null,
                totalReviews: 0,
            },
            topSelling: [],
            topRated: [],
        };
    }

    // Más vendidos: suma de quantity en OrderItems por producto
    const salesByProduct = await prisma.orderItems.groupBy({
        by: ["fk_product"],
        where: {
            fk_product: { in: productIds },
            status: true,
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
    });

    // Mejor valorados: avg de rating por producto
    const ratingsByProduct = await prisma.productReviews.groupBy({
        by: ["fk_product"],
        where: {
            fk_product: { in: productIds },
            status: true,
            rating: { not: null },
        },
        _avg: { rating: true },
        _count: { rating: true },
        orderBy: { _avg: { rating: "desc" } },
        take: 5,
    });

    // Stats globales del comercio
    const allReviews = await prisma.productReviews.aggregate({
        where: {
            fk_product: { in: productIds },
            status: true,
            rating: { not: null },
        },
        _avg: { rating: true },
        _count: { rating: true },
    });

    // Hidratar nombres e imágenes de productos más vendidos
    const topSellingIds = salesByProduct.map(s => s.fk_product);
    const topSellingProducts = await prisma.products.findMany({
        where: { id_product: { in: topSellingIds } },
        select: { id_product: true, name: true, image_url: true, price: true, offer_price: true, is_offer: true }
    });
    const topSellingMap = new Map(topSellingProducts.map(p => [p.id_product, p]));

    // Hidratar nombres e imágenes de productos mejor valorados
    const topRatedIds = ratingsByProduct.map(r => r.fk_product);
    const topRatedProducts = await prisma.products.findMany({
        where: { id_product: { in: topRatedIds } },
        select: { id_product: true, name: true, image_url: true, price: true, offer_price: true, is_offer: true }
    });
    const topRatedMap = new Map(topRatedProducts.map(p => [p.id_product, p]));

    return {
        stats: {
            activeProducts: productIds.length,
            averageRating: allReviews._avg.rating
                ? Number(allReviews._avg.rating.toFixed(2))
                : null,
            totalReviews: allReviews._count.rating,
        },
        topSelling: salesByProduct.map(s => {
            const product = topSellingMap.get(s.fk_product);
            const price = product?.is_offer && product?.offer_price
                ? Number(product.offer_price)
                : Number(product?.price ?? 0);
            return {
                id: s.fk_product,
                name: product?.name ?? "—",
                imageUrl: product?.image_url ?? null,
                price,
                totalSold: s._sum.quantity ?? 0,
            };
        }),
        topRated: ratingsByProduct.map(r => {
            const product = topRatedMap.get(r.fk_product);
            return {
                id: r.fk_product,
                name: product?.name ?? "—",
                imageUrl: product?.image_url ?? null,
                averageRating: Number(r._avg.rating.toFixed(2)),
                reviewCount: r._count.rating,
            };
        }),
    };
};