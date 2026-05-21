import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { validateId } from "../../../lib/validators.js";

const TITLE_MAX = 120;
const URL_MAX = 500;

const parseBoolean = (value, fieldName) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  throw new ValidationError(`${fieldName} debe ser boolean`);
};

const normalizeText = (value, fieldName, { required = false, maxLength } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${fieldName} es requerido`);
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} debe ser string`);
  }

  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new ValidationError(`${fieldName} no puede estar vacío`);
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} no puede superar ${maxLength} caracteres`);
  }

  return trimmed.length === 0 ? null : trimmed;
};

const parseDate = (value, fieldName, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${fieldName} es requerido`);
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} debe ser una fecha válida`);
  }

  return date;
};

const bannerSelect = {
  id_banner: true,
  title: true,
  description: true,
  image_url: true,
  link_url: true,
  start_at: true,
  end_at: true,
  is_active: true,
  status: true,
  created_at: true,
  updated_at: true,
};

const mapBannerResponse = (banner) => ({
  id: banner.id_banner,
  title: banner.title,
  description: banner.description ?? null,
  imageUrl: banner.image_url,
  linkUrl: banner.link_url ?? null,
  startAt: banner.start_at,
  endAt: banner.end_at ?? null,
  isActive: banner.is_active,
  status: banner.status,
  createdAt: banner.created_at,
  updatedAt: banner.updated_at,
});

export const createAdminBannerService = async (payload = {}) => {
  const title = normalizeText(payload.title, "title", { required: true, maxLength: TITLE_MAX });
  const description = normalizeText(payload.description, "description", { maxLength: 500 });
  const imageUrl = normalizeText(payload.imageUrl, "imageUrl", { required: true, maxLength: URL_MAX });
  const linkUrl = normalizeText(payload.linkUrl, "linkUrl", { maxLength: URL_MAX });
  const startAt = parseDate(payload.startAt, "startAt", { required: true });
  const endAt = parseDate(payload.endAt, "endAt");
  const isActive = payload.isActive === undefined
    ? true
    : parseBoolean(payload.isActive, "isActive");

  if (endAt && startAt && endAt < startAt) {
    throw new ValidationError("endAt no puede ser anterior a startAt");
  }

  const created = await prisma.banners.create({
    data: {
      title,
      description,
      image_url: imageUrl,
      link_url: linkUrl,
      start_at: startAt,
      end_at: endAt,
      is_active: isActive,
      status: true,
    },
    select: bannerSelect,
  });

  return mapBannerResponse(created);
};

export const getAdminBannersService = async (filters = {}, pagination = {}) => {
  const where = {};

  if (filters.status === "true") where.status = true;
  else if (filters.status === "false") where.status = false;

  if (filters.active !== undefined) {
    const active = parseBoolean(filters.active, "active");
    where.is_active = active;
  }

  if (filters.search?.toString().trim()) {
    const term = filters.search.toString().trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  const { page = 1, limit = 20, skip = 0 } = pagination;

  const [total, banners] = await Promise.all([
    prisma.banners.count({ where }),
    prisma.banners.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ start_at: "desc" }, { id_banner: "desc" }],
      select: bannerSelect,
    }),
  ]);

  return {
    data: banners.map(mapBannerResponse),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateAdminBannerService = async (bannerId, payload = {}) => {
  const id = validateId(bannerId);

  const existing = await prisma.banners.findUnique({
    where: { id_banner: id },
    select: bannerSelect,
  });

  if (!existing || existing.status === false) {
    throw new NotFoundError("Banner no encontrado");
  }

  const hasStartAt = Object.prototype.hasOwnProperty.call(payload, "startAt");
  const hasEndAt = Object.prototype.hasOwnProperty.call(payload, "endAt");

  const startAt = hasStartAt
    ? parseDate(payload.startAt, "startAt", { required: true })
    : existing.start_at;

  let endAt = existing.end_at;
  if (hasEndAt) {
    if (payload.endAt === null || payload.endAt === "") {
      endAt = null;
    } else {
      endAt = parseDate(payload.endAt, "endAt");
    }
  }

  if (endAt && startAt && endAt < startAt) {
    throw new ValidationError("endAt no puede ser anterior a startAt");
  }

  const data = {};

  if (payload.title !== undefined) {
    data.title = normalizeText(payload.title, "title", { required: true, maxLength: TITLE_MAX });
  }

  if (payload.description !== undefined) {
    data.description = normalizeText(payload.description, "description", { maxLength: 500 });
  }

  if (payload.imageUrl !== undefined) {
    data.image_url = normalizeText(payload.imageUrl, "imageUrl", { required: true, maxLength: URL_MAX });
  }

  if (payload.linkUrl !== undefined) {
    data.link_url = normalizeText(payload.linkUrl, "linkUrl", { maxLength: URL_MAX });
  }

  if (hasStartAt) data.start_at = startAt;
  if (hasEndAt) data.end_at = endAt;

  if (payload.isActive !== undefined) {
    data.is_active = parseBoolean(payload.isActive, "isActive");
  }

  const updated = await prisma.banners.update({
    where: { id_banner: id },
    data,
    select: bannerSelect,
  });

  return mapBannerResponse(updated);
};

export const toggleAdminBannerActiveService = async (bannerId, isActive) => {
  const id = validateId(bannerId);
  const normalizedActive = parseBoolean(isActive, "isActive");

  const existing = await prisma.banners.findUnique({
    where: { id_banner: id },
    select: { id_banner: true, status: true },
  });

  if (!existing || existing.status === false) {
    throw new NotFoundError("Banner no encontrado");
  }

  const updated = await prisma.banners.update({
    where: { id_banner: id },
    data: { is_active: normalizedActive },
    select: bannerSelect,
  });

  return mapBannerResponse(updated);
};
