import { z } from "zod";

export const CreateReviewReportDTO = z.object({
  reason: z.enum(["SPAM", "OFFENSIVE", "FAKE", "OTHER"], {
    error: "reason debe ser SPAM, OFFENSIVE, FAKE o OTHER"
  }),
  description: z.string().max(2000, "description no puede superar 2000 caracteres").nullable().optional()
});

export const ResolveReviewReportDTO = z.object({
  decision: z.enum(["KEEP_REVIEW", "REMOVE_REVIEW"], {
    error: "decision debe ser KEEP_REVIEW o REMOVE_REVIEW"
  })
});
