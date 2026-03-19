
export class BaseResponseDTO {
  id: number;
  created_at: Date;
  updated_at: Date;

  constructor(data: { id: number; created_at: Date; updated_at: Date }) {
    this.id = data.id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}


export class PaginatedResponseDTO<T> {
  content: T[];
  total_elements: number;
  total_pages: number;
  size: number;
  page: number;

  constructor(data: {
    content: T[];
    total_elements: number;
    size: number;
    page: number;
  }) {
    this.content = data.content;
    this.total_elements = data.total_elements;
    this.size = data.size > 0 ? data.size : 0;
    this.total_pages = data.size > 0 ? Math.ceil(data.total_elements / data.size) : 0;
    this.page = data.page;
  }

  static from<T>(
    items: T[],
    totalCount: number,
    page: number,
    limit: number
  ): PaginatedResponseDTO<T> {
    return new PaginatedResponseDTO({
      content: items,
      total_elements: totalCount,
      size: limit,
      page
    });
  }
}
