export class BaseResponseDTO {
  constructor(data) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}

export class PaginatedResponseDTO {
  constructor(data) {
    this.content = data.content;
    this.total_elements = data.total_elements;
    this.size = data.size > 0 ? data.size : 0;
    this.total_pages = data.size > 0 ? Math.ceil(data.total_elements / data.size) : 0;
    this.page = data.page;
  }

  static from(items, totalCount, page, limit) {
    return new PaginatedResponseDTO({
      content: items,
      total_elements: totalCount,
      size: limit,
      page
    });
  }
}