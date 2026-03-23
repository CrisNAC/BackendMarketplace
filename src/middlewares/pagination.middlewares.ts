import { Request, Response, NextFunction } from "express";

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const parsePagination = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
    const limit =
        Number.isInteger(rawLimit) && rawLimit > 0
            ? Math.min(rawLimit, MAX_LIMIT)
            : DEFAULT_LIMIT;

    // Adjuntamos los valores parseados al request para que el controller los use
    (req as any).pagination = {
        page,
        limit,
        skip: (page - 1) * limit
    };

    next();
};