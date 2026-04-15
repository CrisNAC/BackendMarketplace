import { prisma } from "../../../lib/prisma.js";
import { NotFoundError } from "../../../lib/errors.js";

export const getAdminProductCategoryService = async (id) => {
  const category = await prisma.productCategories.findUnique({
    where: { id_product_category: id },
    select: {
      id_product_category: true,
      name: true,
      status: true,
      created_at: true,
      updated_at: true,
      _count: { select: { products: true } }
    }
  });

  if (!category) throw new NotFoundError("Categoría no encontrada");

  return {
    id: category.id_product_category,
    name: category.name,
    status: category.status,
    productCount: category._count.products,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  };
};