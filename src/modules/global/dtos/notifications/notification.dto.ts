import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateNotificationDTO = z.object({
  fk_user: z
    .number({ error: "fk_user es requerido" })
    .int()
    .positive("fk_user debe ser un ID válido"),

  title: z
    .string({ error: "title es requerido" })
    .min(1, "title no puede estar vacío")
    .max(100, "title no puede superar 100 caracteres"),

  message: z
    .string()
    .max(2000, "message no puede superar 2000 caracteres")
    .nullable()
    .optional()
});

export type CreateNotificationDTOType = z.infer<typeof CreateNotificationDTO>;

export const UpdateNotificationDTO = z
  .object({
    read: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateNotificationDTOType = z.infer<typeof UpdateNotificationDTO>;

export const FilterNotificationDTO = z.object({
  read: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),

  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("page debe ser mayor a 0"))
    .optional()
    .default(1),

  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100, "limit no puede superar 100"))
    .optional()
    .default(10)
});

export type FilterNotificationDTOType = z.infer<typeof FilterNotificationDTO>;

// ─── RESPONSE ────────────────────────────────────────────────────
export class NotificationResponseDTO extends BaseResponseDTO {
  id_notification: number;
  fk_user: number;
  title: string;
  message: string | null;
  read: boolean;

  constructor(data: any) {
    super({
      id: data.id_notification,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_notification = data.id_notification;
    this.fk_user = data.fk_user;
    this.title = data.title;
    this.message = data.message ?? null;
    this.read = data.read;
    // status excluido intencionalmente
  }

  static map(data: any): NotificationResponseDTO {
    return new NotificationResponseDTO(data);
  }

  static mapList(data: any[]): NotificationResponseDTO[] {
    return data.map(NotificationResponseDTO.map);
  }
}
