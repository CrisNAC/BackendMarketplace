import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  registerUser,
  updateUser,
  updateUserPassword,
  getUserProfile,
} from "../../../src/modules/users/users/controllers/users.controllers.js";

vi.mock("../../../src/modules/users/users/services/users.services.js", () => ({
  createUserService: vi.fn(),
  updateUserService: vi.fn(),
  updateUserPasswordService: vi.fn(),
  getUserProfileService: vi.fn(),
}));

import {
  createUserService,
  updateUserService,
  updateUserPasswordService,
  getUserProfileService,
} from "../../../src/modules/users/users/services/users.services.js";

const makeCtx = (params = {}, body = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body };
  return { req, res };
};

const mockUser = { id_user: 2, name: "Carlos", email: "carlos@test.com", role: "CUSTOMER" };

describe("registerUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando faltan campos obligatorios", async () => {
    const { req, res } = makeCtx({}, { email: "a@b.com" });
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "name, email y password son requeridos" })
    );
  });

  it("retorna 400 cuando el formato del email es inválido", async () => {
    const { req, res } = makeCtx({}, { name: "Ana", email: "no-es-email", password: "123456" });
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna 201 con el usuario registrado correctamente", async () => {
    const { req, res } = makeCtx({}, { name: "Ana", email: "ana@test.com", password: "123456" });
    createUserService.mockResolvedValue(mockUser);
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Usuario registrado exitosamente" })
    );
  });

  it("retorna 409 cuando el email ya está en uso", async () => {
    const { req, res } = makeCtx({}, { name: "Ana", email: "ana@test.com", password: "123456" });
    createUserService.mockRejectedValue({ statusCode: 409, message: "El email ya se encuentra registrado" });
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("retorna 500 cuando el error no tiene statusCode", async () => {
    const { req, res } = makeCtx({}, { name: "Ana", email: "ana@test.com", password: "123456" });
    createUserService.mockRejectedValue(new Error("DB error"));
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("updateUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con el perfil actualizado", async () => {
    const { req, res } = makeCtx({ id_user: "2" }, { name: "Carlos Nuevo" });
    updateUserService.mockResolvedValue({ ...mockUser, name: "Carlos Nuevo" });
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Perfil actualizado exitosamente" })
    );
  });

  it("retorna error status cuando el servicio falla con status", async () => {
    const { req, res } = makeCtx({ id_user: "2" }, { name: "" });
    updateUserService.mockRejectedValue({ status: 400, message: "name no puede estar vacio" });
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna 500 cuando el error no tiene status", async () => {
    const { req, res } = makeCtx({ id_user: "2" });
    updateUserService.mockRejectedValue(new Error("DB error"));
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("updateUserPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 al actualizar la contraseña", async () => {
    const { req, res } = makeCtx({ id_user: "2" }, { currentPassword: "vieja", newPassword: "nueva1234" });
    updateUserPasswordService.mockResolvedValue(mockUser);
    await updateUserPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Contrasena actualizada exitosamente" })
    );
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id_user: "2" }, { currentPassword: "mal", newPassword: "nueva" });
    updateUserPasswordService.mockRejectedValue({ status: 400, message: "Contraseña incorrecta" });
    await updateUserPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("getUserProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con el perfil del usuario", async () => {
    const { req, res } = makeCtx({ id_user: "2" });
    getUserProfileService.mockResolvedValue(mockUser);
    await getUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockUser }));
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id_user: "2" });
    getUserProfileService.mockRejectedValue({ status: 404, message: "No encontrado" });
    await getUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("retorna 500 cuando el error no tiene status", async () => {
    const { req, res } = makeCtx({ id_user: "2" });
    getUserProfileService.mockRejectedValue(new Error("DB"));
    await getUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});