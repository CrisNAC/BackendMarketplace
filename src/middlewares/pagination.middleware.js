import { PAGINATION } from "../utils/contants/pagination.constant.js";

export const parsePagination = (req, res, next) => {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;

    const page =
        rawPage === undefined
            ? PAGINATION.DEFAULT_PAGE
            : Number(rawPage);

    const limit =
        rawLimit === undefined
            ? PAGINATION.DEFAULT_LIMIT
            : Number(rawLimit);

    const errors = [];

    if (!Number.isInteger(page) || page <= 0) {
        errors.push({
            field: "page",
            message: "page debe ser un entero positivo"
        });
    }

    if (!Number.isInteger(limit) || limit <= 0) {
        errors.push({
            field: "limit",
            message: "limit debe ser un entero positivo"
        });
    } else if (limit > PAGINATION.MAX_LIMIT) {
        errors.push({
            field: "limit",
            message: `limit no puede ser mayor a ${PAGINATION.MAX_LIMIT}`
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    req.pagination = {
        page,
        limit,
        skip: (page - 1) * limit
    };

    next();
};