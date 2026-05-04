import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import bcrypt from "bcrypt";
import {
  getAuthorizedCustomerService,
  createUserService,
  updateUserService,
  updateUserPasswordService,
  getUserProfileService,
} from "../../../src/modules/users/users/services/users.services.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const mockCustomer = { id_user: 2, role: "CUSTOMER", status: true };
const mockSeller = { id_user: 2, role: "SELLER", status: true };
const mockInactiveUser = { id_user: 2, role: "CUSTOMER", status: false };
const mockUserProfile = {
  id_user: 2,
  name: "Carlos",
  email: "carlos@test.com",
  phone: null,
  role: "CUSTOMER",
  status: true,
  created_at: new Date("2026-01-01"),
  updated_at: new Date("2026-01-01"),
  addresses: [],
};

// ─── getAuthorizedCustomerService ────────────────────────────────────────────

describe("getAuthorizedCustomerService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 401 cuando authenticatedUserId es null", async () => {
    await expect(getAuthorizedCustomerService(null, 2)).rejects.toMatchObject({ status: 401 });
  });

  it("lanza 403 cuando el usuario autenticado no es el mismo que el solicitado", async () => {
    await expect(getAuthorizedCustomerService(1, 2)).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 400 cuando authenticatedUserId es inválido", async () => {
    await expect(getAuthorizedCustomerService(-1, -1)).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 404 cuando el usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    await expect(getAuthorizedCustomerService(2, 2)).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 404 cuando el usuario está inactivo", async () => {
    prisma.users.findUnique.mockResolvedValue(mockInactiveUser);
    await expect(getAuthorizedCustomerService(2, 2)).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 403 cuando el usuario no es CUSTOMER", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    await expect(getAuthorizedCustomerService(2, 2)).rejects.toMatchObject({
      status: 403,
      message: "El usuario no es un cliente",
    });
  });

  it("retorna el usuario cuando es CUSTOMER válido", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    const result = await getAuthorizedCustomerService(2, 2);
    expect(result.id_user).toBe(2);
    expect(result.role).toBe("CUSTOMER");
  });
});

// ─── createUserService ────────────────────────────────────────────────────────

describe("createUserService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 409 cuando el email ya está registrado", async () => {
    prisma.users.findUnique.mockResolvedValue({ id_user: 1 });
    await expect(
      createUserService({ name: "Ana", email: "ana@test.com", password: "123456" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("crea el usuario correctamente con phone null cuando no se provee", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed_password");
    prisma.users.create.mockResolvedValue({
      id_user: 3,
      name: "Ana",
      email: "ana@test.com",
      phone: null,
      role: "CUSTOMER",
      status: true,
      created_at: new Date(),
    });

    const result = await createUserService({ name: "Ana", email: "ana@test.com", password: "123456" });

    expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);
    expect(prisma.users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "CUSTOMER", phone: null }),
      })
    );
    expect(result.id_user).toBe(3);
  });

  it("incluye phone cuando se provee", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed");
    prisma.users.create.mockResolvedValue({ id_user: 4, name: "Bob", email: "bob@test.com", phone: "0981123456", role: "CUSTOMER", status: true, created_at: new Date() });

    await createUserService({ name: "Bob", email: "bob@test.com", password: "pass", phone: "0981123456" });

    expect(prisma.users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "0981123456" }),
      })
    );
  });
});

// ─── updateUserService ────────────────────────────────────────────────────────

describe("updateUserService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 403 cuando el usuario no es él mismo", async () => {
    await expect(updateUserService(1, 2, { name: "Nuevo" })).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 400 cuando name está vacío", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    await expect(updateUserService(2, 2, { name: "   " })).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando name supera 100 caracteres", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    await expect(updateUserService(2, 2, { name: "x".repeat(101) })).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando phone supera 20 caracteres", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    await expect(updateUserService(2, 2, { phone: "1".repeat(21) })).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando el formato de email es inválido", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    await expect(updateUserService(2, 2, { email: "no-es-email" })).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 409 cuando el email ya está en uso por otro usuario", async () => {
    prisma.users.findUnique
      .mockResolvedValueOnce(mockCustomer)   // getAuthorizedUserForUpdateService
      .mockResolvedValueOnce({ id_user: 99 }); // checkEmail: otro usuario ya usa ese email
    await expect(updateUserService(2, 2, { email: "otro@test.com" })).rejects.toMatchObject({ status: 409 });
  });

  it("lanza 400 cuando no se envía ningún campo", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    await expect(updateUserService(2, 2, {})).rejects.toMatchObject({ status: 400 });
  });

  it("actualiza el name correctamente", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    prisma.users.update.mockResolvedValue({ ...mockUserProfile, name: "Nuevo Nombre" });

    const result = await updateUserService(2, 2, { name: "Nuevo Nombre" });

    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Nuevo Nombre" } })
    );
    expect(result.name).toBe("Nuevo Nombre");
  });

  it("acepta phone null para borrar el teléfono", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    prisma.users.update.mockResolvedValue({ ...mockUserProfile, phone: null });

    await updateUserService(2, 2, { phone: null });

    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: null } })
    );
  });

  it("no lanza error cuando email pertenece al mismo usuario", async () => {
    prisma.users.findUnique
      .mockResolvedValueOnce(mockCustomer)
      .mockResolvedValueOnce({ id_user: 2 }); // mismo usuario
    prisma.users.update.mockResolvedValue(mockUserProfile);

    await expect(updateUserService(2, 2, { email: "same@test.com" })).resolves.not.toThrow();
  });
});

// ─── updateUserPasswordService ────────────────────────────────────────────────

describe("updateUserPasswordService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 400 cuando currentPassword o newPassword están ausentes", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    await expect(
      updateUserPasswordService(2, 2, { currentPassword: "abc" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando newPassword tiene menos de 6 caracteres", async () => {
    prisma.users.findUnique.mockResolvedValue(mockCustomer);
    await expect(
      updateUserPasswordService(2, 2, { currentPassword: "actual123", newPassword: "abc" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 404 cuando el usuario no se encuentra para la verificación de password", async () => {
    prisma.users.findUnique
      .mockResolvedValueOnce(mockCustomer)  // getAuthorizedUserForUpdateService
      .mockResolvedValueOnce(null);          // findUnique para password_hash

    await expect(
      updateUserPasswordService(2, 2, { currentPassword: "actual123", newPassword: "nueva1234" })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 400 cuando la contraseña actual es incorrecta", async () => {
    prisma.users.findUnique
      .mockResolvedValueOnce(mockCustomer)
      .mockResolvedValueOnce({ password_hash: "hash_viejo" });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      updateUserPasswordService(2, 2, { currentPassword: "incorrecta", newPassword: "nueva1234" })
    ).rejects.toMatchObject({ status: 400, message: "La contraseña actual es incorrecta" });
  });

  it("actualiza la contraseña correctamente", async () => {
    prisma.users.findUnique
      .mockResolvedValueOnce(mockCustomer)
      .mockResolvedValueOnce({ password_hash: "hash_viejo" });
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("nuevo_hash");
    prisma.users.update.mockResolvedValue(mockUserProfile);

    const result = await updateUserPasswordService(2, 2, {
      currentPassword: "actual123",
      newPassword: "nueva1234",
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("nueva1234", 10);
    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { password_hash: "nuevo_hash" } })
    );
    expect(result).toEqual(mockUserProfile);
  });
});

// ─── getUserProfileService ────────────────────────────────────────────────────

describe("getUserProfileService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 403 cuando el usuario solicitado no es el autenticado", async () => {
    await expect(getUserProfileService(1, 2)).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 cuando findFirst no devuelve el usuario", async () => {
    prisma.users.findUnique.mockResolvedValue({ id_user: 2, status: true });
    prisma.users.findFirst.mockResolvedValue(null);

    await expect(getUserProfileService(2, 2)).rejects.toMatchObject({ status: 404 });
  });

  it("retorna el perfil del usuario correctamente", async () => {
    prisma.users.findUnique.mockResolvedValue({ id_user: 2, status: true });
    prisma.users.findFirst.mockResolvedValue(mockUserProfile);

    const result = await getUserProfileService(2, 2);

    expect(result.id_user).toBe(2);
    expect(result.name).toBe("Carlos");
    expect(result.addresses).toEqual([]);
  });
});