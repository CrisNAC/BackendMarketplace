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

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasUnknownArgument = (error, argumentName) =>
  typeof error?.message === "string" &&
  error.message.includes(`Unknown argument \`${argumentName}\``);

const normalizeUpdatePayload = (payload) => {
  if (!isPlainObject(payload)) {
    throw new ValidationError("Body inválido");
  }

  const data = {};

  if (payload.name !== undefined) {
    if (typeof payload.name !== "string") {
      throw new ValidationError("name debe ser texto");
    }
    const normalizedName = payload.name.trim();
    if (!normalizedName) {
      throw new ValidationError("name no puede estar vacío");
    }
    if (normalizedName.length > 100) {
      throw new ValidationError("name no puede superar 100 caracteres");
    }
    data.name = normalizedName;
  }

  if (payload.description !== undefined) {
    if (payload.description !== null && typeof payload.description !== "string") {
      throw new ValidationError("description debe ser texto o null");
    }
    data.description = payload.description?.trim?.() ?? null;
  }

  if (payload.visibility !== undefined) {
    if (typeof payload.visibility !== "boolean") {
      throw new ValidationError("visibility debe ser boolean");
    }
    
    data.status = payload.visibility;
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("Debe enviar al menos uno: name, description o visibility");
  }

  return data;
};

export const updateAdminProductCategoryService = async (id, payload) => {
  const data = normalizeUpdatePayload(payload);

  const category = await prisma.productCategories.findUnique({
    where: { id_product_category: id },
    select: { id_product_category: true }
  });

  if (!category) throw new NotFoundError("Categoría no encontrada");

  try {
    const updated = await prisma.productCategories.update({
      where: { id_product_category: id },
      data,
      select: {
        id_product_category: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true
      }
    });

    return {
      id: updated.id_product_category,
      name: updated.name,
      description: updated.description ?? null,
      visibility: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    };
  } catch (error) {
    // Compatibilidad con esquemas de Prisma donde ProductCategories aún no tenga "description".
    if (data.description !== undefined && hasUnknownArgument(error, "description")) {
      delete data.description;
      if (Object.keys(data).length === 0) {
        throw new ValidationError("description no está disponible para categorías en este esquema");
      }
      const updated = await prisma.productCategories.update({
        where: { id_product_category: id },
        data,
        select: {
          id_product_category: true,
          name: true,
          status: true,
          created_at: true,
          updated_at: true
        }
      });

      return {
        id: updated.id_product_category,
        name: updated.name,
        description: null,
        visibility: updated.status,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
    }

    throw error;
  }
};