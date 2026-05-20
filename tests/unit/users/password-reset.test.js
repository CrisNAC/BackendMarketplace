import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../../../src/lib/email.service.js";
import {
    requestPasswordResetService,
    validateResetTokenService,
    resetPasswordService,
} from "../../../src/modules/users/users/services/users.services.js";

vi.mock("../../../src/lib/prisma.js", () => ({
    prisma: {
        users: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
    },
}));

vi.mock("bcrypt", () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

vi.mock("crypto", () => ({
    default: {
        randomBytes: vi.fn(() => ({ toString: () => "mockedtoken123abc" })),
    },
}));

vi.mock("../../../src/lib/email.service.js", () => ({
    sendPasswordResetEmail: vi.fn(),
}));

const mockActiveUser = { id_user: 5, status: true };
const mockInactiveUser = { id_user: 5, status: false };
const VALID_TOKEN = "validtoken123abc";
const FUTURE_DATE = new Date(Date.now() + 60 * 60 * 1000);

// ─── requestPasswordResetService ────────────────────────────────────────────

describe("requestPasswordResetService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lanza 400 cuando el email no tiene formato válido", async () => {
        await expect(requestPasswordResetService("no-es-un-email")).rejects.toMatchObject({
            status: 400,
            message: expect.stringContaining("formato"),
        });
    });

    it("lanza 400 cuando el email está vacío", async () => {
        await expect(requestPasswordResetService("")).rejects.toMatchObject({
            status: 400,
        });
    });

    it("retorna sin error y sin enviar email cuando el usuario no existe", async () => {
        prisma.users.findUnique.mockResolvedValue(null);

        await expect(requestPasswordResetService("noexiste@test.com")).resolves.toBeUndefined();
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("retorna sin error y sin enviar email cuando el usuario está inactivo", async () => {
        prisma.users.findUnique.mockResolvedValue(mockInactiveUser);

        await expect(requestPasswordResetService("inactivo@test.com")).resolves.toBeUndefined();
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("genera token, actualiza la BD y envía el email cuando el usuario existe", async () => {
        prisma.users.findUnique.mockResolvedValue(mockActiveUser);
        prisma.users.update.mockResolvedValue({});
        sendPasswordResetEmail.mockResolvedValue(undefined);

        await requestPasswordResetService("usuario@test.com");

        expect(prisma.users.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id_user: mockActiveUser.id_user },
                data: expect.objectContaining({
                    password_reset_token: "mockedtoken123abc",
                    password_reset_token_expires: expect.any(Date),
                }),
            })
        );
        expect(sendPasswordResetEmail).toHaveBeenCalledWith("usuario@test.com", "mockedtoken123abc");
    });

    it("normaliza el email a minúsculas antes de buscar", async () => {
        prisma.users.findUnique.mockResolvedValue(null);

        await requestPasswordResetService("USUARIO@TEST.COM");

        expect(prisma.users.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { email: "usuario@test.com" } })
        );
    });
});

// ─── validateResetTokenService ───────────────────────────────────────────────

describe("validateResetTokenService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lanza 400 cuando no se provee token", async () => {
        await expect(validateResetTokenService(undefined)).rejects.toMatchObject({
            status: 400,
            message: "Token requerido",
        });
    });

    it("lanza 400 cuando el token no existe en la BD", async () => {
        prisma.users.findFirst.mockResolvedValue(null);

        await expect(validateResetTokenService("tokeninexistente")).rejects.toMatchObject({
            status: 400,
            message: expect.stringContaining("no es válido"),
        });
    });

    it("lanza 400 cuando el token existe pero ya expiró", async () => {
        // findFirst con gt: new Date() no encontrará el token expirado → retorna null
        prisma.users.findFirst.mockResolvedValue(null);

        await expect(validateResetTokenService("tokenexpirado")).rejects.toMatchObject({
            status: 400,
            message: expect.stringContaining("expirado"),
        });
    });

    it("resuelve sin error cuando el token es válido y no expiró", async () => {
        prisma.users.findFirst.mockResolvedValue(mockActiveUser);

        await expect(validateResetTokenService(VALID_TOKEN)).resolves.toEqual({ valid: true });
    });

    it("busca el token con filtro de expiración mayor a la fecha actual", async () => {
        prisma.users.findFirst.mockResolvedValue(mockActiveUser);

        await validateResetTokenService(VALID_TOKEN);

        expect(prisma.users.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    password_reset_token: VALID_TOKEN,
                    password_reset_token_expires: { gt: expect.any(Date) },
                    status: true,
                }),
            })
        );
    });
});

// ─── resetPasswordService ────────────────────────────────────────────────────

describe("resetPasswordService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lanza 400 cuando no se provee token", async () => {
        await expect(resetPasswordService(undefined, "nuevaPass1")).rejects.toMatchObject({
            status: 400,
            message: "Token requerido",
        });
    });

    it("lanza 400 cuando no se provee nueva contraseña", async () => {
        await expect(resetPasswordService(VALID_TOKEN, undefined)).rejects.toMatchObject({
            status: 400,
        });
    });

    it("lanza 400 cuando la contraseña tiene menos de 8 caracteres", async () => {
        await expect(resetPasswordService(VALID_TOKEN, "corta")).rejects.toMatchObject({
            status: 400,
            message: expect.stringContaining("8 caracteres"),
        });
    });

    it("lanza 400 cuando el token no existe o ya expiró", async () => {
        prisma.users.updateMany.mockResolvedValue({ count: 0 });
        bcrypt.hash.mockResolvedValue("hash");

        await expect(resetPasswordService("tokeninvalido", "nuevaPass123")).rejects.toMatchObject({
            status: 400,
            message: expect.stringContaining("no es válido"),
        });
    });

    it("actualiza el hash de contraseña y limpia el token en una sola operación atómica", async () => {
        bcrypt.hash.mockResolvedValue("nuevo_hash_hasheado");
        prisma.users.updateMany.mockResolvedValue({ count: 1 });

        await resetPasswordService(VALID_TOKEN, "nuevaPassword123");

        expect(bcrypt.hash).toHaveBeenCalledWith("nuevaPassword123", 10);
        expect(prisma.users.updateMany).toHaveBeenCalledWith({
            where: {
                password_reset_token: VALID_TOKEN,
                password_reset_token_expires: { gt: expect.any(Date) },
                status: true,
            },
            data: {
                password_hash: "nuevo_hash_hasheado",
                password_reset_token: null,
                password_reset_token_expires: null,
            },
        });
    });

    it("elimina los espacios al inicio y fin de la contraseña antes de hashear", async () => {
        bcrypt.hash.mockResolvedValue("hash");
        prisma.users.updateMany.mockResolvedValue({ count: 1 });

        await resetPasswordService(VALID_TOKEN, "  nuevaPass123  ");

        expect(bcrypt.hash).toHaveBeenCalledWith("nuevaPass123", 10);
    });

    it("no actualiza la BD si el token es inválido", async () => {
        bcrypt.hash.mockResolvedValue("hash");
        prisma.users.updateMany.mockResolvedValue({ count: 0 });

        await expect(resetPasswordService("invalido", "nuevaPass123")).rejects.toThrow();
        expect(prisma.users.updateMany).toHaveBeenCalledTimes(1);
    });
});
