export const reviewReportSchemas = {
  ReviewReport: {
    type: "object",
    properties: {
      id_review_report: { type: "integer", example: 1 },
      reason: {
        type: "string",
        enum: ["SPAM", "OFFENSIVE", "FAKE", "OTHER"],
        example: "SPAM",
      },
      description: {
        type: "string",
        nullable: true,
        example: "Esta reseña parece generada automáticamente",
      },
      report_status: {
        type: "string",
        enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"],
        example: "PENDING",
      },
      created_at: { type: "string", format: "date-time" },
    },
  },
};