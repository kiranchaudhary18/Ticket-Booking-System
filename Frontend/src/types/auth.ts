export enum UserRole {
  ADMIN = "ADMIN",
  ORGANIZER = "ORGANIZER",
  CUSTOMER = "CUSTOMER",
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  date_joined?: string;
  last_login?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: UserRole;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  token_type: string;
  exp: number;
  iat: number;
  jti: string;
  user_id: number;
  name: string;
  role: UserRole;
}
