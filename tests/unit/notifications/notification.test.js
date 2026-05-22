import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
    getNotificationsService,
    markNotificationAsReadService,
} from "../../../src/modules/notifications/notification.service.js";
import { NotFoundError, ForbiddenError } from "../../../src/lib/errors.js";

// ─── MOCK DE PRISMA ───────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
    prisma: {
        notifications: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
        },
    },
}));

// ─── DATOS DE PRUEBA ──────────────────────────────────────────────────────────

const mockNotificationUnread = {
    id_notification: 1,
    title: "¡Pedido confirmado!",
    message: "Tu pedido #100 fue confirmado correctamente.",
    read: false,
    created_at: "2026-01-01T00:00:00.000Z",
};

const mockNotificationRead = {
    id_notification: 2,
    title: "¡Pedido confirmado!",
    message: "Tu pedido #101 fue confirmado correctamente.",
    read: true,
    created_at: "2026-01-01T00:00:00.000Z",
};

// ─── getNotificationsService ──────────────────────────────────────────────────

describe("getNotificationsService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("retorna lista de notificaciones con unreadCount correcto", async () => {
        prisma.notifications.findMany.mockResolvedValue([
            mockNotificationUnread,
            mockNotificationRead,
        ]);

        const result = await getNotificationsService(1);

        expect(result.unreadCount).toBe(1);
        expect(result.notifications).toHaveLength(2);
    });

    it("retorna unreadCount 0 cuando todas están leídas", async () => {
        prisma.notifications.findMany.mockResolvedValue([mockNotificationRead]);

        const result = await getNotificationsService(1);

        expect(result.unreadCount).toBe(0);
    });

    it("retorna lista vacía cuando no hay notificaciones", async () => {
        prisma.notifications.findMany.mockResolvedValue([]);

        const result = await getNotificationsService(1);

        expect(result.unreadCount).toBe(0);
        expect(result.notifications).toEqual([]);
    });

    it("mapea correctamente los campos de la notificación", async () => {
        prisma.notifications.findMany.mockResolvedValue([mockNotificationUnread]);

        const result = await getNotificationsService(1);
        const notification = result.notifications[0];

        expect(notification).toMatchObject({
            id: 1,
            title: "¡Pedido confirmado!",
            message: "Tu pedido #100 fue confirmado correctamente.",
            read: false,
            createdAt: "2026-01-01T00:00:00.000Z",
        });
    });

    it("lanza ValidationError cuando userId no es un entero positivo", async () => {
        const { ValidationError } = await import("../../../src/lib/errors.js");

        await expect(getNotificationsService(-1)).rejects.toThrow(ValidationError);
    });
});

// ─── markNotificationAsReadService ───────────────────────────────────────────

describe("markNotificationAsReadService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lanza NotFoundError cuando la notificación no existe", async () => {
        prisma.notifications.findFirst.mockResolvedValue(null);

        await expect(markNotificationAsReadService(1, 99)).rejects.toThrow(NotFoundError);
    });

    it("lanza ForbiddenError cuando la notificación no pertenece al usuario", async () => {
        prisma.notifications.findFirst.mockResolvedValue({
            ...mockNotificationUnread,
            fk_user: 99, // otro usuario
        });

        await expect(markNotificationAsReadService(1, 1)).rejects.toThrow(ForbiddenError);
    });

    it("marca la notificación como leída correctamente", async () => {
        prisma.notifications.findFirst.mockResolvedValue({
            ...mockNotificationUnread,
            fk_user: 1,
        });
        prisma.notifications.update.mockResolvedValue({
            ...mockNotificationUnread,
            read: true,
        });

        const result = await markNotificationAsReadService(1, 1);

        expect(result.read).toBe(true);
        expect(prisma.notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id_notification: 1 },
                data: { read: true },
            })
        );
    });

    it("mapea correctamente los campos al marcar como leída", async () => {
        prisma.notifications.findFirst.mockResolvedValue({
            ...mockNotificationUnread,
            fk_user: 1,
        });
        prisma.notifications.update.mockResolvedValue({
            ...mockNotificationUnread,
            read: true,
        });

        const result = await markNotificationAsReadService(1, 1);

        expect(result).toMatchObject({
            id: 1,
            title: "¡Pedido confirmado!",
            read: true,
            createdAt: "2026-01-01T00:00:00.000Z",
        });
    });

    it("lanza ValidationError cuando notificationId no es un entero positivo", async () => {
        const { ValidationError } = await import("../../../src/lib/errors.js");

        await expect(markNotificationAsReadService(1, -1)).rejects.toThrow(ValidationError);
    });
});