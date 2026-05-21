import { prisma } from "../../../lib/prisma.js";
import { ValidationError } from "../../../lib/errors.js";

const bannerSelect = {
  id_banner: true,
  title: true,
  description: true,
  image_url: true,
  link_url: true,
  start_at: true,
  end_at: true,
  is_active: true,
  created_at: true,
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
  createdAt: banner.created_at,
});

export const getActiveBannersService = async (filters = {}) => {
  const limitRaw = filters.limit !== undefined ? Number(filters.limit) : 10;
  if (!Number.isInteger(limitRaw) || limitRaw <= 0) {
    throw new ValidationError("limit debe ser un entero positivo");
  }
  const limit = Math.min(limitRaw, 50);

  if (!prisma?.banners?.findMany) {
    return [];
  }

  const now = new Date();

  const banners = await prisma.banners.findMany({
    where: {
      status: true,
      is_active: true,
      start_at: { lte: now },
      OR: [{ end_at: null }, { end_at: { gte: now } }],
    },
    orderBy: [{ start_at: "desc" }, { id_banner: "desc" }],
    take: limit,
    select: bannerSelect,
  });

  return banners.map(mapBannerResponse);
};
