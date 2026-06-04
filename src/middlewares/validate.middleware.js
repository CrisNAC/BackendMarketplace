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

            // Contrato por sección: query → req.validated; params → mutar req.params
            // (misma referencia, merge de campos validados); body/otros → req[section].
            if (section === "query") {
                req.validated = result.data;
            } else if (section === "params") {
                Object.assign(req.params, result.data);
            } else {
                req[section] = result.data;
            }

            next();
        };