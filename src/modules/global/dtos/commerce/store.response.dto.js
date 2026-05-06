import { BaseResponseDTO } from "../base/base.response.dto.js";
// ─── CATEGORY NESTED ─────────────────────────────────────────────
export class CategoryNestedDTO {
    id_category;
    name;
    status;
    constructor(data) {
        this.id_category = data.id_category;
        this.name = data.name;
        this.status = data.status ?? null;
    }
}
// ─── STORE RESPONSE DTO ──────────────────────────────────────────
export class StoreResponseDTO extends BaseResponseDTO {
    id_store;
    name;
    email;
    phone;
    description;
    logo;
    website_url;
    instagram_url;
    tiktok_url;
    fk_user;
    categories;
    store_category;
    constructor(data) {
        const categories = Array.isArray(data.categories)
            ? data.categories.map((category) => new CategoryNestedDTO(category))
            : [];

        super({
            id: data.id_store,
            created_at: data.created_at,
            updated_at: data.updated_at
        });
        this.id_store = data.id_store;
        this.name = data.name;
        this.email = data.email;
        this.phone = data.phone;
        this.description = data.description ?? null;
        this.logo = data.logo ?? null;
        this.website_url = data.website_url ?? null;
        this.instagram_url = data.instagram_url ?? null;
        this.tiktok_url = data.tiktok_url ?? null;
        this.fk_user = data.fk_user;
        this.categories = categories;
        this.store_category = categories[0]
            ? {
                id_store_category: categories[0].id_category,
                name: categories[0].name
            }
            : null;
        // status excluido intencionalmente
    }
    static map(data) {
        return new StoreResponseDTO(data);
    }
    static mapList(data) {
        return data.map(StoreResponseDTO.map);
    }
}
