import { prisma } from "../../../lib/prisma.js";

const MAX_TAGS_PER_PRODUCT = 10;

export const parseProductTagIdsService = (tags) => {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw { status: 400, message: "tags debe ser un arreglo de ids" };
  }

  const parsed = tags.map((tag) => Number(tag));
  if (parsed.some((tagId) => !Number.isInteger(tagId) || tagId <= 0)) {
    throw { status: 400, message: "Cada tag debe ser un id numerico valido" };
  }

  const uniqueTagIds = [...new Set(parsed)];

  if (uniqueTagIds.length > MAX_TAGS_PER_PRODUCT) {
    throw {
      status: 400,
      message: `Se permiten hasta ${MAX_TAGS_PER_PRODUCT} tags por producto`
    };
  }

  return uniqueTagIds;
};

export const validateProductTagsService = async (tagIds) => {
  if (!tagIds.length) {
    return;
  }

  const existingTags = await prisma.productTags.findMany({
    where: {
      id_product_tag: { in: tagIds },
      status: true
    },
    select: { id_product_tag: true }
  });

  if (existingTags.length !== tagIds.length) {
    throw { status: 400, message: "Uno o mas tags no son validos" };
  }
};

export const getProductTagsService = async (filters = {}) => {
  const search = filters.search?.toString().trim();
  const limitRaw = Number(filters.limit);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, 100)
    : 100;

  const tags = await prisma.productTags.findMany({
    where: {
      status: true,
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {})
    },
    select: {
      id_product_tag: true,
      name: true,
      created_at: true,
      updated_at: true
    },
    orderBy: { name: "asc" },
    take: limit
  });

  return tags.map((tag) => ({
    id: tag.id_product_tag,
    name: tag.name,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at
  }));
};
