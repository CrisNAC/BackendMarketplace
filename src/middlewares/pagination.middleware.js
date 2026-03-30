import paginationConstants from "../utils/contants/pagination.contant.js";
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = paginationConstants;

export const parsePagination = (req, res, next) => {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;

    const page =
        rawPage === undefined
            ? DEFAULT_PAGE
            : Number(rawPage);

    const limit =
        rawLimit === undefined
            ? DEFAULT_LIMIT
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
    } else if (limit > MAX_LIMIT) {
        errors.push({
            field: "limit",
            message: `limit no puede ser mayor a ${MAX_LIMIT}`
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