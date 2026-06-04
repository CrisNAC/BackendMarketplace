import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { getAuthorizedStoreOwnerService } from "../commerces/store.service.js";

const TITLE_MAX = 120;
const URL_MAX = 500;

const normalizeText = (value, fieldName, { required = false, maxLength } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${fieldName} es requerido`);
    return null;
  }
  if (typeof value !== "string") throw new ValidationError(`${fieldName} debe ser string`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new ValidationError(`${fieldName} no puede estar vacío`);
  if (maxLength && trimmed.length > maxLength) throw new ValidationError(`${fieldName} no puede superar ${maxLength} caracteres`);
  return trimmed.length === 0 ? null : trimmed;
};

const parseDate = (value, fieldName, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${fieldName} es requerido`);
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) throw new ValidationError(`${fieldName} debe ser una fecha válida`);
  return date;
};

const bannerRequestSelect = {
  id_banner: true,
  fk_store: true,
  title: true,
  description: true,
  image_url: true,
  link_url: true,
  start_at: true,
  end_at: true,
  approval_status: true,
  rejection_reason: true,
  created_at: true,
  updated_at: true,
};

const mapRequestResponse = (b) => ({
  id: b.id_banner,
  storeId: b.fk_store,
  title: b.title,
  description: b.description ?? null,
  imageUrl: b.image_url ?? null,
  linkUrl: b.link_url ?? null,
  startAt: b.start_at,
  endAt: b.end_at ?? null,
  approvalStatus: b.approval_status,
  rejectionReason: b.rejection_reason ?? null,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
});

export const createBannerRequestService = async (authenticatedUserId, storeIdStr, payload = {}) => {
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeIdStr);

  const title = normalizeText(payload.title, "title", { required: true, maxLength: TITLE_MAX });
  const description = normalizeText(payload.description, "description", { maxLength: 500 });
  const imageUrl = normalizeText(payload.imageUrl, "imageUrl", { maxLength: URL_MAX });
  const linkUrl = normalizeText(payload.linkUrl, "linkUrl", { maxLength: URL_MAX });
  const startAt = parseDate(payload.startAt, "startAt", { required: true });
  const endAt = parseDate(payload.endAt, "endAt");

  if (endAt && endAt < startAt) {
    throw new ValidationError("endAt no puede ser anterior a startAt");
  }

  const created = await prisma.banners.create({
    data: {
      fk_store: store.id_store,
      title,
      description,
      image_url: imageUrl,
      link_url: linkUrl,
      start_at: startAt,
      end_at: endAt,
      is_active: false,
      approval_status: "PENDING",
      status: true,
    },
    select: bannerRequestSelect,
  });

  return mapRequestResponse(created);
};

export const getMyBannerRequestsService = async (authenticatedUserId, storeIdStr, filters = {}, pagination = {}) => {
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeIdStr);

  const where = { fk_store: store.id_store, status: true };

  if (filters.approval_status) {
    const validStatuses = ["PENDING", "ACTIVE", "REJECTED"];
    if (!validStatuses.includes(filters.approval_status)) {
      throw new ValidationError(`approval_status debe ser uno de: ${validStatuses.join(", ")}`);
    }
    where.approval_status = filters.approval_status;
  }

  const { page = 1, limit = 10, skip = 0 } = pagination;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
  const safeSkip = Number(skip) >= 0 ? Number(skip) : 0;

  const [total, requests] = await Promise.all([
    prisma.banners.count({ where }),
    prisma.banners.findMany({
      where,
      skip: safeSkip,
      take: safeLimit,
      orderBy: { created_at: "desc" },
      select: bannerRequestSelect,
    }),
  ]);

  return {
    data: requests.map(mapRequestResponse),
    pagination: {
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const deleteBannerRequestService = async (authenticatedUserId, storeIdStr, bannerIdStr) => {
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeIdStr);
  const bannerId = Number(bannerIdStr);

  if (!Number.isInteger(bannerId) || bannerId <= 0) {
    throw new ValidationError("ID de solicitud inválido");
  }

  const exists = await prisma.banners.findFirst({
    where: { id_banner: bannerId, fk_store: store.id_store, status: true },
    select: { id_banner: true, approval_status: true },
  });

  if (!exists) throw new NotFoundError("Solicitud de banner no encontrada");

  if (exists.approval_status !== "PENDING") {
    throw new ValidationError("Solo se pueden cancelar solicitudes en estado PENDING");
  }

  const { count } = await prisma.banners.updateMany({
    where: { id_banner: bannerId, fk_store: store.id_store, approval_status: "PENDING", status: true },
    data: { status: false },
  });

  if (count === 0) {
    throw new ValidationError("La solicitud ya fue procesada y no puede cancelarse");
  }
};
