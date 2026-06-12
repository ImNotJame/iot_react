import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, AUTH_LOGIN_URL, AUTH_REFRESH_URL } from "../config/api";
import { apiClient } from "../api";
import TokenExpiredModal from "../components/TokenExpiredModal";

const AUTH_STORAGE_KEY = "iot-auth";
const REQUEST_TIMEOUT_MS = 10000;

const AuthContext = createContext(null);

export { AuthContext };

function isJwtExpired(token) {
  if (!token) {
    return true;
  }

  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) {
      return true;
    }

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}


function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);
    if (isJwtExpired(session?.refreshToken)) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.error("Unable to read auth session from storage", error);
    return null;
  }
}


async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => readStoredSession());
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const isReady = true;


  useEffect(() => {
    apiClient.onAuthError = () => {
      setShowTokenExpiredModal(true);
    };
  }, []);


  const persistSession = useCallback((nextSession) => {
    setSession(nextSession);
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
  }, []);


  const clearSession = useCallback(() => {
    setSession(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);


  const refreshSession = useCallback(async () => {
    if (!session?.refreshToken || isJwtExpired(session.refreshToken)) {
      clearSession();
      throw new Error("Your session has expired. Please log in again.");
    }

    let response;
    try {
      response = await fetchWithTimeout(AUTH_REFRESH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Refresh request timed out. Check whether the backend is running.", {
          cause: error,
        });
      }

      throw new Error("Unable to refresh your session right now.", { cause: error });
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      clearSession();
      const detail =
        typeof payload?.detail === "string"
          ? payload.detail
          : "Your session has expired. Please log in again.";
      throw new Error(detail);
    }

    const nextSession = {
      ...session,
      token: payload.jwt_token,
      refreshToken: payload.refresh_token,
      expiresAt: payload.expires_at,
    };

    persistSession(nextSession);
    return nextSession;
  }, [clearSession, persistSession, session]);


  const fetchWithAuth = useCallback(async (url, options) => {
    let activeSession = session;
    const headers = new Headers(options.headers ?? {});

    if (activeSession?.token) {
      headers.set("Authorization", `Bearer ${activeSession.token}`);
    }

    let response;
    try {
      response = await fetchWithTimeout(url, {
        ...options,
        headers,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("The backend took too long to respond.", {
          cause: error,
        });
      }

      throw new Error("Unable to reach the backend right now.", { cause: error });
    }

    if (response.status === 401 && activeSession?.refreshToken) {
      activeSession = await refreshSession();
      const retryHeaders = new Headers(options.headers ?? {});
      retryHeaders.set("Authorization", `Bearer ${activeSession.token}`);

      response = await fetchWithTimeout(url, {
        ...options,
        headers: retryHeaders,
      });
    }

    if (response.status === 401) {
      clearSession();
      navigate("/login", { replace: true });
      throw new Error("Your session has expired. Please log in again.");
    }

    return response;
  }, [clearSession, navigate, refreshSession, session]);


  const login = useCallback(async ({ username, password }) => {
    let response;
    try {
      response = await fetchWithTimeout(AUTH_LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Login request timed out. Check whether the backend is running.", {
          cause: error,
        });
      }

      throw new Error("Unable to reach the backend right now.", { cause: error });
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const detail =
        typeof payload?.detail === "string"
          ? payload.detail
          : "Login failed. Check your username and password.";
      throw new Error(detail);
    }

    const nextSession = {
      token: payload.jwt_token,
      refreshToken: payload.refresh_token,
      expiresAt: payload.expires_at,
      username,
    };

    persistSession(nextSession);
    return nextSession;
  }, [persistSession]);


  const authenticatedFetch = useCallback(async (url, options = {}) => {

    const endpoint = url.replace(API_BASE_URL, "");
    const method = options.method || "GET";
    
    switch (method.toUpperCase()) {
      case "GET":
        return apiClient.get(endpoint);
      case "POST":
        return apiClient.post(endpoint, options.body ? JSON.parse(options.body) : {});
      case "PUT":
        return apiClient.put(endpoint, options.body ? JSON.parse(options.body) : {});
      case "DELETE":
        return apiClient.delete(endpoint);
      default:
        return apiClient.request(endpoint, options);
    }
  }, []);


  const logout = useCallback(async () => {
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
      clearSession();
      navigate("/login", { replace: true });
    }
  }, [clearSession, navigate,session]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshSession();

      await apiClient.processQueue();
      setShowTokenExpiredModal(false);
    } catch (error) {
      console.error("Failed to refresh session:", error);

      apiClient.clearQueue();
      clearSession();
      navigate("/login", { replace: true });
    }
  }, [refreshSession, clearSession, navigate]);


  const handleLogout = useCallback(async () => {
    try {

      apiClient.clearQueue();

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
      clearSession();
      setShowTokenExpiredModal(false);
      navigate("/login", { replace: true });
    }
  }, [clearSession, navigate, session]);

  const value = useMemo(
    () => ({
      authenticatedFetch,
      handleLogout,
      handleRefresh,
      isAuthenticated: Boolean(session?.refreshToken) && !isJwtExpired(session.refreshToken),
      isReady,
      login,
      logout,
      showTokenExpiredModal,
      token: session?.token ?? "",
      username: session?.username ?? "",
    }),
    [authenticatedFetch, handleLogout, handleRefresh, isReady, login, logout, session, showTokenExpiredModal],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <TokenExpiredModal
        isVisible={showTokenExpiredModal}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      />
      <ToastContainer />
    </AuthContext.Provider>
  );
}
