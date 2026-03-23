import { PaginatedResponseDTO } from "../base/base.response.dto.js";

export class StoreProductItemDTO {
    id_product: number;
    name: string;
    description: string | null;
    price: number;
    quantity: number | null;
    visible: boolean;
    created_at: Date;
    product_category: { id_product_category: number; name: string } | null;

    constructor(data: any) {
        this.id_product = data.id_product;
        this.name = data.name;
        this.description = data.description ?? null;
        this.price = Number(data.price);
        this.quantity = data.quantity ?? null;
        this.visible = data.visible;
        this.created_at = data.created_at;
        this.product_category = data.product_category
            ? {
                id_product_category: data.product_category.id_product_category,
                name: data.product_category.name
            }
            : null;
    }

    static map(data: any): StoreProductItemDTO {
        return new StoreProductItemDTO(data);
    }
}

// Tipo concreto de la respuesta paginada
export type StoreProductsPageDTO = PaginatedResponseDTO<StoreProductItemDTO>;