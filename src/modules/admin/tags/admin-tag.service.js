import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError, ConflictError } from "../../../lib/errors.js";

const MAX_TAG_NAME_LENGTH = 20;

const normalizeAdminTagName = (name) => {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError("El nombre de la etiqueta no puede estar vacío");
  }

  const normalizedName = name.trim();
  if (normalizedName.length > MAX_TAG_NAME_LENGTH) {
    throw new ValidationError(`El nombre de la etiqueta no puede superar ${MAX_TAG_NAME_LENGTH} caracteres`);
  }

  return normalizedName;
};

export const createAdminTagService = async (name) => {
  const normalizedName = normalizeAdminTagName(name);

  const existingTag = await prisma.productTags.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive"
      },
      status: true
    },
    select: { id_product_tag: true }
  });

  if (existingTag) {
    throw new ValidationError("Ya existe una etiqueta con ese nombre");
  }

  let createdTag;
  try {
    createdTag = await prisma.productTags.create({
      data: {
        name: normalizedName,
        status: true
      },
      select: {
        id_product_tag: true,
        name: true,
        status: true,
        created_at: true
      }
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ConflictError("Ya existe una etiqueta con ese nombre");
    }
    throw error;
  }

  return {
    id: createdTag.id_product_tag,
    name: createdTag.name,
    status: createdTag.status,
    createdAt: createdTag.created_at
  };
};

export const getAllAdminTagsService = async () => {
  const tags = await prisma.productTags.findMany({
    where: { status: true },
    orderBy: { name: "asc" },
    select: {
      id_product_tag: true,
      name: true,
      status: true,
      created_at: true,
      updated_at: true,
      _count: { select: { product_tag_relations: true } }
    }
  });

  return tags.map((tag) => ({
    id: tag.id_product_tag,
    name: tag.name,
    status: tag.status,
    productCount: tag._count.product_tag_relations,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at
  }));
};

export const updateAdminTagService = async (id, name) => {
  const normalizedName = normalizeAdminTagName(name);

  const tag = await prisma.productTags.findUnique({
    where: { id_product_tag: id },
    select: { id_product_tag: true, status: true }
  });

  if (!tag || !tag.status) {
    throw new NotFoundError("Etiqueta no encontrada");
  }

  // Verificar que no exista otra etiqueta activa con el mismo nombre
  const duplicateTag = await prisma.productTags.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive"
      },
      status: true,
      id_product_tag: { not: id }
    },
    select: { id_product_tag: true }
  });

  if (duplicateTag) {
    throw new ValidationError("Ya existe una etiqueta con ese nombre");
  }

  let updated;
  try {
    updated = await prisma.productTags.update({
      where: { id_product_tag: id },
      data: { name: normalizedName },
      select: {
        id_product_tag: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true
      }
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ConflictError("Ya existe una etiqueta con ese nombre");
    }
    throw error;
  }

  return {
    id: updated.id_product_tag,
    name: updated.name,
    status: updated.status,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at
  };
};

export const deleteAdminTagService = async (id) => {
  const tag = await prisma.productTags.findUnique({
    where: { id_product_tag: id },
    select: { id_product_tag: true, status: true }
  });

  if (!tag || !tag.status) {
    throw new NotFoundError("Etiqueta no encontrada");
  }

  await prisma.$transaction([
    prisma.productTagRelations.deleteMany({
      where: { fk_product_tag: id }
    }),
    prisma.productTags.update({
      where: { id_product_tag: id },
      data: { status: false }
    })
  ]);
};
