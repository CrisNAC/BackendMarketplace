import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import { getUsersAdminService } from "../../../src/modules/admin/users/admin-users.service.js";
import { ValidationError } from "../../../src/lib/errors.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockPagination = { page: 1, limit: 10, skip: 0 };

const mockUsers = [
  {
    id_user: 1,
    name: "María González",
    email: "maria@email.com",
    role: "CUSTOMER",
    status: true,
    created_at: new Date("2024-01-15"),
  },
  {
    id_user: 2,
    name: "TechStore S.A.",
    email: "contacto@techstore.com",
    role: "SELLER",
    status: true,
    created_at: new Date("2024-01-10"),
  },
  {
    id_user: 3,
    name: "Carlos Ruiz",
    email: "carlos@email.com",
    role: "CUSTOMER",
    status: false,
    created_at: new Date("2024-01-12"),
  },
];

// ─── getUsersAdminService ────────────────────────────────────────────────────

describe("getUsersAdminService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Sin filtros ──────────────────────────────────────────────────────────

  it("retorna todos los usuarios cuando no se aplican filtros", async () => {
    prisma.users.count.mockResolvedValue(3);
    prisma.users.findMany.mockResolvedValue(mockUsers);

    const result = await getUsersAdminService({}, mockPagination);

    expect(result.data).toHaveLength(3);
    expect(result.pagination.total).toBe(3);
  });

  it("retorna estructura correcta con data y pagination", async () => {
    prisma.users.count.mockResolvedValue(1);
    prisma.users.findMany.mockResolvedValue([mockUsers[0]]);

    const result = await getUsersAdminService({}, mockPagination);

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("pagination");
    expect(result.pagination).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  it("mapea correctamente los campos del usuario en la respuesta", async () => {
    prisma.users.count.mockResolvedValue(1);
    prisma.users.findMany.mockResolvedValue([mockUsers[0]]);

    const result = await getUsersAdminService({}, mockPagination);
    const user = result.data[0];

    expect(user).toMatchObject({
      id: 1,
      name: "María González",
      email: "maria@email.com",
      role: "CUSTOMER",
      status: true,
    });
    expect(user).toHaveProperty("createdAt");
    // No debe exponer campos sensibles
    expect(user).not.toHaveProperty("password_hash");
    expect(user).not.toHaveProperty("id_user");
  });

  it("retorna array vacío cuando no hay usuarios", async () => {
    prisma.users.count.mockResolvedValue(0);
    prisma.users.findMany.mockResolvedValue([]);

    const result = await getUsersAdminService({}, mockPagination);

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  // ── Filtro por search ────────────────────────────────────────────────────

  it("aplica filtro OR por nombre y email cuando se envía search", async () => {
    prisma.users.count.mockResolvedValue(1);
    prisma.users.findMany.mockResolvedValue([mockUsers[0]]);

    await getUsersAdminService({ search: "maria" }, mockPagination);

    expect(prisma.users.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: "maria", mode: "insensitive" } },
            { email: { contains: "maria", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("ignora search cuando es string vacío o solo espacios", async () => {
    prisma.users.count.mockResolvedValue(3);
    prisma.users.findMany.mockResolvedValue(mockUsers);

    await getUsersAdminService({ search: "   " }, mockPagination);

    expect(prisma.users.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ OR: expect.anything() }) })
    );
  });

  // ── Filtro por role ──────────────────────────────────────────────────────

  it("filtra por role CUSTOMER correctamente", async () => {
    prisma.users.count.mockResolvedValue(2);
    prisma.users.findMany.mockResolvedValue([mockUsers[0], mockUsers[2]]);

    await getUsersAdminService({ role: "CUSTOMER" }, mockPagination);

    expect(prisma.users.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "CUSTOMER" }),
      })
    );
  });

  it("normaliza el role a mayúsculas antes de filtrar", async () => {
    prisma.users.count.mockResolvedValue(1);
    prisma.users.findMany.mockResolvedValue([mockUsers[1]]);

    await getUsersAdminService({ role: "seller" }, mockPagination);

    expect(prisma.users.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "SELLER" }),
      })
    );
  });

  it("lanza ValidationError cuando el role no es válido", async () => {
    await expect(
      getUsersAdminService({ role: "SUPERADMIN" }, mockPagination)
    ).rejects.toThrow(ValidationError);
  });

  it("acepta todos los roles válidos: ADMIN, CUSTOMER, SELLER, DELIVERY", async () => {
    prisma.users.count.mockResolvedValue(0);
    prisma.users.findMany.mockResolvedValue([]);

    for (const role of ["ADMIN", "CUSTOMER", "SELLER", "DELIVERY"]) {
      await expect(
        getUsersAdminService({ role }, mockPagination)
      ).resolves.not.toThrow();
    }
  });

  // ── Filtro por status ────────────────────────────────────────────────────

  it("filtra por status=true correctamente", async () => {
    prisma.users.count.mockResolvedValue(2);
    prisma.users.findMany.mockResolvedValue([mockUsers[0], mockUsers[1]]);

    await getUsersAdminService({ status: "true" }, mockPagination);

    expect(prisma.users.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: true }),
      })
    );
  });

  it("filtra por status=false correctamente", async () => {
    prisma.users.count.mockResolvedValue(1);
    prisma.users.findMany.mockResolvedValue([mockUsers[2]]);

    await getUsersAdminService({ status: "false" }, mockPagination);

    expect(prisma.users.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: false }),
      })
    );
  });

  it("lanza ValidationError cuando status no es true ni false", async () => {
    await expect(
      getUsersAdminService({ status: "activo" }, mockPagination)
    ).rejects.toThrow(ValidationError);
  });

  // ── Filtros combinados ───────────────────────────────────────────────────

  it("combina search + role + status correctamente en el where", async () => {
    prisma.users.count.mockResolvedValue(1);
    prisma.users.findMany.mockResolvedValue([mockUsers[0]]);

    await getUsersAdminService(
      { search: "maria", role: "CUSTOMER", status: "true" },
      mockPagination
    );

    expect(prisma.users.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "CUSTOMER",
          status: true,
          OR: expect.any(Array),
        }),
      })
    );
  });

  // ── Paginación ───────────────────────────────────────────────────────────

  it("calcula totalPages correctamente", async () => {
    prisma.users.count.mockResolvedValue(25);
    prisma.users.findMany.mockResolvedValue([]);

    const result = await getUsersAdminService({}, { page: 1, limit: 10, skip: 0 });

    expect(result.pagination.totalPages).toBe(3);
  });

  it("pasa skip y limit correctamente a findMany", async () => {
    prisma.users.count.mockResolvedValue(30);
    prisma.users.findMany.mockResolvedValue([]);

    await getUsersAdminService({}, { page: 3, limit: 10, skip: 20 });

    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it("ordena los resultados por created_at descendente", async () => {
    prisma.users.count.mockResolvedValue(1);
    prisma.users.findMany.mockResolvedValue([mockUsers[0]]);

    await getUsersAdminService({}, mockPagination);

    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { created_at: "desc" },
      })
    );
  });
});