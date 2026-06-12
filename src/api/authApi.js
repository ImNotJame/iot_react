import { apiClient } from "./client";

export const authApi = {

  async login(username, password) {
    const response = await apiClient.publicPost("/auth/login", { username, password });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();
    const session = {
      token: data.jwt_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      username,
    };
    sessionStorage.setItem("iot-auth", JSON.stringify(session));
    return session;
  },


  logout() {
    return apiClient.logout();
  },



  async refresh() {
    const session = JSON.parse(sessionStorage.getItem("iot-auth") || "null");
    if (!session?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiClient.publicPost("/auth/refresh", {
      refresh_token: session.refreshToken,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to refresh session");
    }

    const data = await response.json();
    const newSession = {
      ...session,
      token: data.jwt_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
    sessionStorage.setItem("iot-auth", JSON.stringify(newSession));
    return newSession;
  },


  getSession() {
    try {
      return JSON.parse(sessionStorage.getItem("iot-auth") || "null");
    } catch {
      return null;
    }
  },


  isAuthenticated() {
    const session = this.getSession();
    if (!session?.refreshToken) return false;
    

    try {
      const base64Url = session.refreshToken.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },


  clearSession() {
    sessionStorage.removeItem("iot-auth");
  },
};
