import { prisma } from "../../../lib/prisma.js"

const parsePositiveInteger = (value, fieldName) => {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw {
            status: 400,
            message: `${fieldName} invalido`
        };
    }

    return parsedValue;
}

export const validateStoreCategoryService = async (categoryId) => {
    const parsedCategoryId = parsePositiveInteger(
        categoryId,
        "fk_store_category"
    );

    const category = await prisma.storeCategories.findUnique({
        where: { id_store_category: parsedCategoryId },
        select: {
            id_store_category: true,
            status: true
        }
    });

    if (!category || !category.status) {
        throw {
            status: 400,
            message: "fk_store_category no es valido"
        };
    }

    return parsedCategoryId;
};

export const getStoreCategoriesService = async (filters = {}) => {
    const search = filters.search?.toString().trim();
    const limitRaw = Number(filters.limit);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0
        ? Math.min(limitRaw, 100)
        : 100;

    const categories = await prisma.storeCategories.findMany({
        where: {
            status: true,
            ...(search
                ? {
                    name: {
                        contains: search,
                        mode: "insensitive"
                    }
                }
                : {})
        },
        select: {
            id_store_category: true,
            name: true,
            status: true,
            created_at: true,
            updated_at: true
        },
        orderBy: {
            name: "asc"
        },
        take: limit
    });

    return categories.map((category) => ({
        id: category.id_store_category,
        name: category.name,
        status: category.status,
        createdAt: category.created_at,
        updatedAt: category.updated_at
    }));
};