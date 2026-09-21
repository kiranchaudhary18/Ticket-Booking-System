import { apiClient } from "./api-client";
import { ENDPOINTS } from "@/lib/api";
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  User,
} from "@/types/auth";

export const authService = {
  /**
   * Register a new user
   * Payload: name, email, password, confirm_password, role
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>(
      ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data;
  },

  /**
   * Login to get JWT access and refresh tokens
   * Payload: email, password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      ENDPOINTS.AUTH.LOGIN,
      data
    );
    return response.data;
  },

  /**
   * Logout user by blacklisting the refresh token
   * Payload: refresh
   */
  async logout(refreshToken: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT, {
      refresh: refreshToken,
    });
  },

  /**
   * Get the currently authenticated user's profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>(ENDPOINTS.AUTH.ME);
    return response.data;
  },

  /**
   * Update the currently authenticated user's profile
   */
  async updateCurrentUser(
    data: Partial<Omit<User, "id" | "email" | "role" | "date_joined" | "last_login" | "is_active">>
  ): Promise<User> {
    const response = await apiClient.patch<User>(ENDPOINTS.AUTH.ME, data);
    return response.data;
  },

  /**
   * Change the currently authenticated user's password
   */
  async changePassword(data: Record<string, string>): Promise<void> {
    await apiClient.post("/api/accounts/change-password/", data);
  },
};
