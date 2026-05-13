import {
    getNotificationsService,
    markNotificationAsReadService
} from "./notification.service.js";

export const getNotificationsController = async (req, res, next) => {
    try {
        const result = await getNotificationsService(req.user.id);
        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const markNotificationAsReadController = async (req, res, next) => {
    try {
        const result = await markNotificationAsReadService(req.user.id, req.params.id);
        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};