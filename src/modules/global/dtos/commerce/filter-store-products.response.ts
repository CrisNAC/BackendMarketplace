type StoreProductCategoryData = {
  id_product_category: number;
  name: string;
};

type StoreProductItemData = {
  id_product: number;
  name: string;
  description?: string | null;
  price: number | string;
  original_price?: number | string | null;
  offer_price?: number | string | null;
  is_offer?: boolean | null;
  quantity?: number | null;
  visible: boolean;
  created_at: Date;
  product_category?: StoreProductCategoryData | null;
};

export class StoreProductCategoryNestedDTO {
  id_product_category: number;
  name: string;

  constructor(data: StoreProductCategoryData) {
    this.id_product_category = data.id_product_category;
    this.name = data.name;
  }
}

export class StoreProductItemDTO {
  id_product: number;
  name: string;
  description: string | null;
  price: number;
  original_price: number;
  offer_price: number | null;
  is_offer: boolean;
  quantity: number | null;
  visible: boolean;
  created_at: Date;
  product_category: StoreProductCategoryNestedDTO | null;

  constructor(data: StoreProductItemData) {
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
    this.created_at = data.created_at;
    this.product_category = data.product_category
      ? new StoreProductCategoryNestedDTO(data.product_category)
      : null;
  }

  static map(data: StoreProductItemData): StoreProductItemDTO {
    return new StoreProductItemDTO(data);
  }

  static mapList(data: StoreProductItemData[]): StoreProductItemDTO[] {
    return data.map((item) => StoreProductItemDTO.map(item));
  }
}

export class StoreProductsPageDTO {
  content: StoreProductItemDTO[];
  total_elements: number;
  size: number;
  total_pages: number;
  page: number;

  constructor(
    items: StoreProductItemData[],
    totalCount: number,
    page: number,
    limit: number
  ) {
    this.content = StoreProductItemDTO.mapList(items);
    this.total_elements = totalCount;
    this.size = limit > 0 ? limit : 0;
    this.total_pages = limit > 0 ? Math.ceil(totalCount / limit) : 0;
    this.page = page;
  }

  static from(
    items: StoreProductItemData[],
    totalCount: number,
    page: number,
    limit: number
  ): StoreProductsPageDTO {
    return new StoreProductsPageDTO(items, totalCount, page, limit);
  }
}
