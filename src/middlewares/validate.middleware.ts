import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type RequestSection = "body" | "query" | "params";

export const validate =
    (schema: ZodSchema, section: RequestSection = "body") =>
        (req: Request, res: Response, next: NextFunction): void => {
            const result = schema.safeParse(req[section]);

            if (!result.success) {
                const errors = result.error.errors.map((e) => ({
                    field: e.path.join("."),
                    message: e.message
                }));

                res.status(400).json({
                    message: "Error de validación",
                    errors
                });
                return;
            }

            // Reemplaza el valor original con el dato ya parseado y transformado por Zod
            req[section] = result.data as any;
            next();
        };