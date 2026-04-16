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
        this.product_category = data.product_category
            ? {
                id_product_category: data.product_category.id_product_category,
                name: data.product_category.name
            }
            : null;
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
