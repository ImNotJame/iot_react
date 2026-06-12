import { API_BASE_URL } from "../config/api";

const REQUEST_TIMEOUT_MS = 10000;


function getSession() {
  try {
    const raw = sessionStorage.getItem("iot-auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}


function isJwtExpired(token) {
  if (!token) return true;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}


async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}


async function refreshAccessToken() {
  const session = getSession();
  if (!session?.refreshToken || isJwtExpired(session.refreshToken)) {
    throw new Error("Session expired. Please log in again.");
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
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
}


class ApiClient {
  constructor() {
    this.refreshPromise = null;
    this.requestQueue = [];
    this.onAuthError = null; 
  }


  checkAuthExpired() {
    const session = getSession();
    if (session?.token && isJwtExpired(session.token)) {
      return true;
    }
    return false;
  }


  async processQueue() {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    for (const req of queue) {
      try {
        const response = await this.request(req.endpoint, req.options);
        req.resolve(response);
      } catch (error) {
        req.reject(error);
      }
    }
  }


  clearQueue() {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    for (const req of queue) {
      req.reject(new Error("Session expired"));
    }
  }


  async request(endpoint, options = {}) {
    const session = getSession();
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers ?? {});

    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`);
    }


    if (this.checkAuthExpired() && this.onAuthError) {
      // Queue this request and show modal
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ endpoint, options, resolve, reject });
        this.onAuthError();
      });
    }

    let response = await fetchWithTimeout(url, { ...options, headers });


    if (response.status === 401 && session?.refreshToken) {
      try {

        if (!this.refreshPromise) {
          this.refreshPromise = refreshAccessToken().finally(() => {
            this.refreshPromise = null;
          });
        }

        const newSession = await this.refreshPromise;
        headers.set("Authorization", `Bearer ${newSession.token}`);

        response = await fetchWithTimeout(url, { ...options, headers });
      } catch (error) {

        if (this.onAuthError) {
          return new Promise((resolve, reject) => {
            this.requestQueue.push({ endpoint, options, resolve, reject });
            this.onAuthError();
          });
        }

        throw error;
      }
    }

    if (response.status === 401) {

      if (this.onAuthError) {
        return new Promise((resolve, reject) => {
          this.requestQueue.push({ endpoint, options, resolve, reject });
          this.onAuthError();
        });
      }

      sessionStorage.removeItem("iot-auth");
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }

    return response;
  }


  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }


  async publicPost(endpoint, body) {
    const url = `${API_BASE_URL}${endpoint}`;
    return fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async logout() {
    const session = getSession();
    try {
      await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token && { Authorization: `Bearer ${session.token}` }),
        },
        body: JSON.stringify({ refresh_token: session?.refreshToken }),
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      sessionStorage.removeItem("iot-auth");
      this.clearQueue();
    }
  }
}

export const apiClient = new ApiClient();
