import { prisma } from "../../../../lib/prisma.js";
import { ValidationError, NotFoundError } from "../../../../lib/errors.js";

export const validateProductCategoryService = async (categoryId) => {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new ValidationError("categoryId debe ser un numero valido");
  }

  const category = await prisma.categories.findUnique({
    where: { id_category: categoryId },
    select: { id_category: true, status: true }
  });

  if (!category || !category.status) {
    throw new NotFoundError("categoryId no es valida");
  }
};

export const validateProductCategoriesService = async (categoryData) => {
  if (categoryData === undefined || categoryData === null) {
    return [];
  }

  const categoryIds = Array.isArray(categoryData)
    ? categoryData
    : [categoryData];

  const normalizedCategoryIds = [...new Set(
    categoryIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];

  if (normalizedCategoryIds.length === 0) {
    throw new ValidationError("categoryIds debe contener al menos un numero valido");
  }

  if (normalizedCategoryIds.length > 3) {
    throw new ValidationError("Un producto no puede tener mas de 3 categorias");
  }

  const categories = await prisma.categories.findMany({
    where: {
      id_category: { in: normalizedCategoryIds },
      status: true
    },
    select: { id_category: true }
  });

  if (categories.length !== normalizedCategoryIds.length) {
    throw new NotFoundError("Una o mas categories no son validas");
  }

  return normalizedCategoryIds;
};

export const getProductCategoriesService = async (filters = {}) => {
  const search = filters.search?.toString().trim();
  const limitRaw = Number(filters.limit);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, 100)
    : 100;

  const categories = await prisma.categories.findMany({
    where: {
      status: true,
      visible: true,
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {})
    },
    select: {
      id_category: true,
      name: true,
      icon: true,
      status: true,
      created_at: true,
      updated_at: true
    },
    orderBy: { name: "asc" },
    take: limit
  });

  return categories.map((category) => ({
    id: category.id_category,
    name: category.name,
    icon: category.icon ?? null,
    status: category.status,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  }));
};
