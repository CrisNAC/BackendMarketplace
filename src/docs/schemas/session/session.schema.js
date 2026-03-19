
export const sessionSchemas = {
    LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
            email: { type: "string", format: "email", example: "vendedor@mail.com" },
            password: { type: "string", example: "password123" }
        }
    }, LoginResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Login exitoso" },
            user: {
                type: "object",
                properties: {
                    id_user: { type: "integer", example: 1 },
                    name: { type: "string", example: "Juan Pérez" },
                    email: { type: "string", example: "vendedor@mail.com" },
                    role: { type: "string", enum: ["ADMIN", "CUSTOMER", "SELLER", "DELIVERY"] }
                }
            }
        }
    }, UserSessionResponse: {
        type: "object",
        properties: {
            success: { type: "boolean", example: true },
            user: {
                type: "object",
                properties: {
                    id_user: { type: "integer", example: 1 },
                    name: { type: "string", example: "Juan Pérez" },
                    email: { type: "string", example: "vendedor@mail.com" },
                    phone: { type: "string", nullable: true, example: "0981123456" },
                    role: { type: "string", example: "SELLER" },
                    id_store: { type: "integer", nullable: true, example: 3 }
                }
            }
        }
    }
}