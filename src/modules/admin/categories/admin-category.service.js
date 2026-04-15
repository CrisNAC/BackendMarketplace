import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError  } from "../../../lib/errors.js";

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

export const deleteAdminProductCategoryService = async (id) => {
  if (id === 1) {
    throw new ValidationError("No se puede eliminar la categoría Sin categoría");
  }

  const category = await prisma.productCategories.findUnique({
    where: { id_product_category: id }
  });

  if (!category) throw new NotFoundError("Categoría no encontrada");

  await prisma.$transaction([
    prisma.products.updateMany({
      where: { fk_product_category: id },
      data: { fk_product_category: 1 }
    }),
    prisma.productCategories.update({
      where: { id_product_category: id },
      data: { status: false }
    })
  ]);
};