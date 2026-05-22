import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";
import { parsePositiveInteger } from "../../lib/validators.js";

export const createNotificationService = async (tx, { userId, title, message, reference_id }) => {
    return tx.notifications.create({
        data: {
            fk_user: userId,
            title,
            message: message ?? null,
            reference_id: reference_id ?? null,
            read: false,
            status: true
        }
    });
};

export const getNotificationsService = async (authenticatedUserId) => {
    const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");

    const notifications = await prisma.notifications.findMany({
        where: { fk_user: resolvedUserId, status: true },
        orderBy: { created_at: "desc" },
        select: {
            id_notification: true,
            title: true,
            message: true,
            read: true,
            reference_id: true,
            created_at: true
        }
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return {
        unreadCount,
        notifications: notifications.map((n) => ({
            id: n.id_notification,
            title: n.title,
            message: n.message,
            read: n.read,
            referenceId: n.reference_id,
            createdAt: n.created_at
        }))
    };
};

export const markNotificationAsReadService = async (authenticatedUserId, notificationId) => {
    const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
    const resolvedNotificationId = parsePositiveInteger(notificationId, "notificationId");

    const notification = await prisma.notifications.findFirst({
        where: { id_notification: resolvedNotificationId, status: true }
    });

    if (!notification) throw new NotFoundError("Notificación no encontrada");

    if (notification.fk_user !== resolvedUserId)
        throw new ForbiddenError("No tienes permisos para modificar esta notificación");

    const updated = await prisma.notifications.update({
        where: { id_notification: resolvedNotificationId },
        data: { read: true },
        select: {
            id_notification: true,
            title: true,
            message: true,
            read: true,
            reference_id: true,
            created_at: true
        }
    });

    return {
        id: updated.id_notification,
        title: updated.title,
        message: updated.message,
        read: updated.read,
        referenceId: updated.reference_id,
        createdAt: updated.created_at
    };
};