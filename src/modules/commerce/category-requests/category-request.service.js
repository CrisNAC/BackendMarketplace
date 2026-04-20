import { prisma } from "../../../lib/prisma.js";
import { ValidationError, ConflictError } from "../../../lib/errors.js";

/**
 * Validar que el nombre de la categoría no esté vacío
 * @param {string} name - Nombre de la categoría
 * @throws {ValidationError} Si el nombre está vacío o no es válido
 */
export const validateCategoryName = (name) => {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError("El nombre de la categoría no puede estar vacío");
  }

  const normalizedName = name.trim();

  if (normalizedName.length > 100) {
    throw new ValidationError("El nombre de la categoría no puede exceder 100 caracteres");
  }

  return normalizedName;
};

/**
 * Verificar que no exista una categoría activa o una solicitud pendiente con ese nombre
 * @param {string} name - Nombre de la categoría
 * @throws {ConflictError} Si la categoría ya existe o ya tiene solicitud pendiente
 */
export const checkExistingCategoryOrPendingRequest = async (name) => {
  const existingCategory = await prisma.productCategories.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive"
      },
      status: true
    },
    select: {
      visible: true
    }
  });

  if (existingCategory) {
    if (existingCategory.visible) {
      throw new ConflictError(`La categoría "${name}" ya existe`);
    }

    throw new ConflictError(
      `Ya existe una solicitud pendiente para la categoría "${name}"`
    );
  }
};

/**
 * Crear una nueva solicitud de categoría
 * @param {string} name - Nombre de la categoría solicitada
 * @returns {Promise<Object>} La solicitud de categoría creada
 */
export const createCategoryRequestService = async (name) => {
  const normalizedName = validateCategoryName(name);

  await checkExistingCategoryOrPendingRequest(normalizedName);

  // Se crea en ProductCategories como solicitud pendiente (visible=false)
  const categoryRequest = await prisma.productCategories.create({
    data: {
      name: normalizedName,
      visible: false,
      status: true
    },
    select: {
      id_product_category: true,
      name: true,
      visible: true,
      status: true,
      created_at: true,
      updated_at: true
    }
  });

  return {
    id: categoryRequest.id_product_category,
    name: categoryRequest.name,
    visible: categoryRequest.visible,
    status: categoryRequest.status,
    createdAt: categoryRequest.created_at,
    updatedAt: categoryRequest.updated_at
  };
};