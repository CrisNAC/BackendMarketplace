import { z } from "zod";

export const AdminUpdateProductStatusDTO = z.object({
  status: z.enum(["ACTIVE", "REJECTED"]),
  reason: z.string().trim().optional()
}).refine(
  (data) => data.status !== "REJECTED" || (data.reason && data.reason.trim().length > 0),
  {
    message: "reason es requerido al rechazar un producto",
    path: ["reason"]
  }
);
