export const addressSchemas = {
    AddressResponse: {
        type: "object",
        properties: {
            id_address: { type: "integer", example: 1 },
            fk_user: { type: "integer", example: 1 },
            fk_store: { type: "integer", example: 3 },
            address: { type: "string", example: "Av. España 1234" },
            city: { type: "string", example: "Asunción" },
            region: { type: "string", example: "Villa Morra" },
            postal_code: { type: "string", nullable: true, example: "1209" },
            status: { type: "boolean", example: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" }
        }
    },
    CreateAddressRequest: {
        type: "object",
        required: ["address", "city", "region"],
        properties: {
            address: { type: "string", example: "Av. España 1234" },
            city: { type: "string", maxLength: 100, example: "Asunción" },
            region: { type: "string", maxLength: 100, example: "Villa Morra" },
            postal_code: { type: "string", maxLength: 20, nullable: true, example: "1209" }
        }
    },
    UpdateAddressRequest: {
        type: "object",
        properties: {
            address: { type: "string", example: "Av. España 1234" },
            city: { type: "string", maxLength: 100, example: "Asunción" },
            region: { type: "string", maxLength: 100, example: "Villa Morra" },
            postal_code: { type: "string", maxLength: 20, nullable: true, example: "1209" }
        }
    },
    DeleteAddressResponse: {
        type: "object",
        properties: {
            id_address: { type: "integer", example: 1 },
            status: { type: "boolean", example: false },
            updated_at: { type: "string", format: "date-time" }
        }
    },
}