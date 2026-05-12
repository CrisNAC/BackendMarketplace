import { PaginatedResponseDTO } from "../base/base.response.dto.js";

export class StoreProductItemDTO {
    constructor(data) {
        this.id_product = data.id_product;
        this.name = data.name;
        this.description = data.description ?? null;
        this.price = Number(data.price);
        this.original_price = Number(data.original_price ?? data.price);
        this.offer_price =
            data.offer_price === null || data.offer_price === undefined
                ? null
                : Number(data.offer_price);
        this.is_offer = Boolean(data.is_offer);
        this.quantity = data.quantity ?? null;
        this.visible = data.visible;
        this.image_url = data.image_url ?? null; 
        this.created_at = data.created_at;
        const primaryCategory = data.product_category ?? data.category ?? null;
        const categoriesSource = Array.isArray(data.categories)
            ? data.categories
            : Array.isArray(data.product_categories)
                ? data.product_categories.map((relation) => relation.category ?? relation)
                : [];

        this.product_category = primaryCategory
            ? {
                id_product_category: primaryCategory.id_category ?? primaryCategory.id_product_category,
                name: primaryCategory.name
            }
            : null;
        this.category = this.product_category;
        this.categories = categoriesSource
            .filter((category) => category && (category.id_category || category.id_product_category))
            .map((category) => ({
                id_product_category: category.id_category ?? category.id_product_category,
                name: category.name
            }));
    }

    static map(data) {
        return new StoreProductItemDTO(data);
    }

    static mapList(data) {
        return data.map(StoreProductItemDTO.map);
    }
}

export class StoreProductsPageDTO extends PaginatedResponseDTO {
    constructor(items, totalCount, page, limit) {
        super({
            content: StoreProductItemDTO.mapList(items),
            total_elements: totalCount,
            size: limit,
            page
        });
    }

    static from(items, totalCount, page, limit) {
        return new StoreProductsPageDTO(items, totalCount, page, limit);
    }
}
