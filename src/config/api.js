export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export const AUTH_LOGIN_URL = `${API_BASE_URL}/auth/login`;
export const AUTH_REFRESH_URL = `${API_BASE_URL}/auth/refresh`;
