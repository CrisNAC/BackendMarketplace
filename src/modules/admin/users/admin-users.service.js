import { prisma } from "../../../lib/prisma.js";
import { ValidationError } from "../../../lib/errors.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";

const VALID_ROLES = Object.values(ROLES);

const mapUserResponse = (user) => ({
  id: user.id_user,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.created_at,
});

export const getUsersAdminService = async ({ search, role, status }, pagination) => {
  const where = {};

  // Filtro por búsqueda (nombre o email)
  if (search?.toString().trim()) {
    const term = search.toString().trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  // Filtro por rol
  if (role !== undefined) {
    const normalizedRole = role.toString().toUpperCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      throw new ValidationError(
        `role inválido. Valores permitidos: ${VALID_ROLES.join(", ")}`
      );
    }
    where.role = normalizedRole;
  }

  // Filtro por estado
  if (status !== undefined) {
    const normalizedStatus = status.toString().toLowerCase();
    if (normalizedStatus !== "true" && normalizedStatus !== "false") {
      throw new ValidationError("status debe ser true o false");
    }
    where.status = normalizedStatus === "true";
  }

  const { page, limit, skip } = pagination;

  const [total, users] = await Promise.all([
    prisma.users.count({ where }),
    prisma.users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id_user: true,
        name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
      },
    }),
  ]);

  return {
    data: users.map(mapUserResponse),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
