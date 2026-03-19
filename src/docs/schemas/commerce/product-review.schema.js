export const productReviewSchemas = {
    // ─── REQUESTS ──────────────────────────────────────────────────
    CreateReviewRequest: {
        type: "object",
        required: ["rating"],
        properties: {
            rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
            comment: { type: "string", nullable: true, example: "Muy buen producto" }
        }
    },

    // ─── RESPONSES ─────────────────────────────────────────────────
    ReviewItemResponse: {
        type: "object",
        properties: {
            id: { type: "integer", example: 1 },
            customerName: { type: "string", example: "Juan Pérez" },
            rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
            comment: { type: "string", nullable: true, example: "Muy buen producto" },
            date: { type: "string", format: "date-time" },
            isVerified: { type: "boolean", example: true }
        }
    },

    ReviewsListResponse: {
        type: "object",
        properties: {
            stats: {
                type: "object",
                properties: {
                    averageRating: { type: "number", nullable: true, example: 4.2 },
                    totalReviews: { type: "integer", example: 25 },
                    verifiedReviews: { type: "integer", example: 20 }
                }
            },
            pagination: {
                type: "object",
                properties: {
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 10 },
                    totalReviews: { type: "integer", example: 25 },
                    totalPages: { type: "integer", example: 3 }
                }
            },
            reviews: {
                type: "array",
                items: { $ref: "#/components/schemas/ReviewItemResponse" }
            }
        }
    }
};