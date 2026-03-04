import { prisma } from "../../../lib/prisma.js";

export const validateProductCategoryService = async (categoryId) => {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw { status: 400, message: "categoryId debe ser un numero valido" };
  }

  const category = await prisma.productCategories.findUnique({
    where: { id_product_category: categoryId },
    select: { id_product_category: true, status: true }
  });

  if (!category || !category.status) {
    throw { status: 400, message: "categoryId no es valida" };
  }
};

export const getProductCategoriesService = async (filters = {}) => {
  const search = filters.search?.toString().trim();
  const limitRaw = Number(filters.limit);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, 100)
    : 100;

  const categories = await prisma.productCategories.findMany({
    where: {
      status: true,
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {})
    },
    select: {
      id_product_category: true,
      name: true,
      status: true,
      created_at: true,
      updated_at: true
    },
    orderBy: { name: "asc" },
    take: limit
  });

  return categories.map((category) => ({
    id: category.id_product_category,
    name: category.name,
    status: category.status,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  }));
};
