import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── USER RESPONSE DTO ───────────────────────────────────────────
export class UserResponseDTO extends BaseResponseDTO {
  id_user: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;

  constructor(data: any) {
    super({
      id: data.id_user,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_user = data.id_user;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone ?? null;
    this.role = data.role;
    // password_hash excluido intencionalmente
    // status excluido intencionalmente
  }

  static map(data: any): UserResponseDTO {
    return new UserResponseDTO(data);
  }

  static mapList(data: any[]): UserResponseDTO[] {
    return data.map(UserResponseDTO.map);
  }
}
