import { z } from "zod";

export const CreateStoreDTO = z.object({
    fk_user: z
        .number({ required_error: "fk_user es requerido" })
        .int()
        .positive(),

    fk_store_category: z
        .number({ required_error: "fk_store_category es requerido" })
        .int()
        .positive(),

    name: z
        .string({ required_error: "name es requerido" })
        .min(1)
        .max(100),

    email: z
        .string({ required_error: "email es requerido" })
        .email("email no tiene formato válido")
        .max(100),

    phone: z
        .string({ required_error: "phone es requerido" })
        .min(1)
        .max(20),

    description: z.string().max(2000).nullable().optional(),
    logo: z.string().url("logo debe ser una URL válida").max(500).nullable().optional(),
    website_url: z.string().url().max(500).nullable().optional(),
    instagram_url: z.string().url().max(500).nullable().optional(),
    tiktok_url: z.string().url().max(500).nullable().optional()
});

export type CreateStoreDTOType = z.infer<typeof CreateStoreDTO>;