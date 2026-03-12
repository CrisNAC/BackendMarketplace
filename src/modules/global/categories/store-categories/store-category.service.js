import { prisma } from "../../../../lib/prisma.js";

export const getStoreCategoriesService = async () => {
  const categories = await prisma.storeCategories.findMany({
    where: { status: true },
    select: {
      id_store_category: true,
      name: true,
      status: true,
      created_at: true,
      updated_at: true
    },
    orderBy: { name: "asc" }
  });

  return categories.map((category) => ({
    id: category.id_store_category,
    name: category.name,
    status: category.status,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  }));
};
