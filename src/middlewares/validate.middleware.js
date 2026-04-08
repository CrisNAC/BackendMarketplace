// src/middlewares/validate.middleware.js
import { ZodError } from "zod";

export const validate =
    (schema, section = "body") =>
        (req, res, next) => {
            const result = schema.safeParse(req[section]);

            if (!result.success) {
                const errors = result.error.issues.map((e) => ({
                    field: e.path.join("."),
                    message: e.message
                }));

                res.status(400).json({
                    message: "Error de validación",
                    errors
                });
                return;
            }

            if (section === "query") {
                req.validated = result.data;
            } else {
                req[section] = result.data;
            }

            next();
        };