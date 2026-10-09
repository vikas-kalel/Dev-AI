import { request } from "./api.js";
import { AuthResponse, MeResponse } from "../types/auth.js";

export const authService = {
  async signup(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  async verifyEmail(
    email: string,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      "/auth/verify-email",
      {
        method: "POST",
        body: JSON.stringify({ email, token }),
      },
    );
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      localStorage.setItem("devai_auth_token", res.token);
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("devai_auth_token");
    }
  },

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
  },

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      "/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ email, token, newPassword }),
      },
    );
  },

  async getMe(): Promise<MeResponse> {
    return request<MeResponse>("/auth/me", { method: "GET" });
  },
};
