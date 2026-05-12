import { prisma } from "../../../lib/prisma.js";

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw {
      status: 400,
      message: `${fieldName} invalido`
    };
  }

  return parsedValue;
};


export const validateStoreCategoriesService = async (categoryData) => {
  if (categoryData === undefined || categoryData === null) {
    return [];
  }

  const categoryIds = Array.isArray(categoryData)
    ? categoryData
    : [categoryData];

  if (categoryIds.length === 0) {
    return [];
  }

  const validatedIds = [...new Set(
    categoryIds.map((id) => parsePositiveInteger(id, "category_id"))
  )];

  if (validatedIds.length > 3) {
    throw {
      status: 400,
      message: "Un comercio no puede tener mas de 3 categorias"
    };
  }

  const categories = await prisma.categories.findMany({
    where: {
      id_category: { in: validatedIds },
      status: true
    },
    select: { id_category: true }
  });

  const foundIds = new Set(categories.map((c) => c.id_category));

  for (const id of validatedIds) {
    if (!foundIds.has(id)) {
      throw {
        status: 400,
        message: `Categoría ${id} no existe o no está activa`
      };
    }
  }

  return validatedIds;
};

export const getStoreCategoriesService = async (filters = {}) => {
  const search = filters.search?.toString().trim();
  const limitRaw = Number(filters.limit);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, 100)
    : 100;

  const categories = await prisma.categories.findMany({
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
      id_category: true,
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
    id: category.id_category,
    name: category.name,
    status: category.status,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  }));
};
