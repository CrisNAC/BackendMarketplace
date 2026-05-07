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

// export const validateStoreCategoryService = async (categoryId) => {
//   const parsedCategoryId = parsePositiveInteger(
//     categoryId,
//     "fk_store_category"
//   );

//   const category = await prisma.categories.findUnique({
//     where: { id_category: parsedCategoryId },
//     select: {
//       id_category: true,
//       status: true
//     }
//   });

//   if (!category || !category.status) {
//     throw {
//       status: 400,
//       message: "fk_store_category no es valido"
//     };
//   }

//   return parsedCategoryId;
// };

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

  const validatedIds = categoryIds.map((id) =>
    parsePositiveInteger(id, "category_id")
  );

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
