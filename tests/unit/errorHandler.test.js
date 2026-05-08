import { vi, describe, it, expect } from "vitest";
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../src/lib/errors.js";

const makeCtx = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { method: "GET", path: "/test" };
  const next = vi.fn();
  return { req, res, next };
};

describe("errorHandler", () => {
  it("maneja AppError con su statusCode", () => {
    const { req, res, next } = makeCtx();
    const err = new NotFoundError("Recurso no encontrado");
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 404, message: "Recurso no encontrado" },
    });
  });

  it("maneja ValidationError (AppError 400)", () => {
    const { req, res, next } = makeCtx();
    errorHandler(new ValidationError("Campo inválido"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("maneja ForbiddenError (AppError 403)", () => {
    const { req, res, next } = makeCtx();
    errorHandler(new ForbiddenError("Sin permiso"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("maneja objeto plano con status (error legacy)", () => {
    const { req, res, next } = makeCtx();
    errorHandler({ status: 404, message: "No encontrado" }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 404, message: "No encontrado" },
    });
  });

  it("maneja objeto plano con statusCode (error legacy alternativo)", () => {
    const { req, res, next } = makeCtx();
    errorHandler({ statusCode: 409, message: "Conflicto" }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("maneja error de multer LIMIT_FILE_SIZE con 413", () => {
    const { req, res, next } = makeCtx();
    errorHandler({ code: "LIMIT_FILE_SIZE" }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 413 }) })
    );
  });

  it("retorna 500 para errores inesperados sin status", () => {
    const { req, res, next } = makeCtx();
    errorHandler(new Error("Error inesperado"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 500, message: "Error interno del servidor" },
    });
  });

  it("retorna 500 cuando el status del legacy es inválido (fuera de 400-599)", () => {
    const { req, res, next } = makeCtx();
    errorHandler({ status: 200, message: "ok" }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});