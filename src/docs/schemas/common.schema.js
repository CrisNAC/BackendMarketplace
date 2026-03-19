export const commonSchemas = {
    ErrorResponse: {
        type: "object",
        properties: {
            message: { type: "string", example: "Error interno del servidor" }
        }
    }, ValidationErrorResponse: {
        type: "object",
        properties: {
            message: { type: "string", example: "Error de validación" },
            errors: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        field: { type: "string", example: "email" },
                        message: { type: "string", example: "email no tiene formato válido" }
                    }
                }
            }
        }
    },
}