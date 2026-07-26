import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { AuthState, User } from "../types";

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_TOKEN_KEY = "smartsched_token";
const STORAGE_USER_KEY = "smartsched_user";

// Shape returned by POST /api/v1/auth/login (see backend/app/schemas/auth.py::TokenResponse).
interface LoginApiResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: {
    user_id: number;
    name: string;
    email: string;
    role: "admin" | "faculty";
    is_active: boolean;
  };
}

/**
 * Calls the real Phase 3 backend: POST /api/v1/auth/login. The backend
 * issues a JWT signed with HS256, carrying the user's id (`sub`) and
 * `role`, which every protected route decodes and checks via
 * `require_role(...)` (see backend/app/api/v1/deps.py).
 */
async function apiLogin(email: string, password: string): Promise<{ user: User; token: string }> {
  const { data } = await api.post<LoginApiResponse>("/auth/login", { email, password });
  const user: User = {
    id: data.user.user_id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role,
  };
  return { user, token: data.access_token };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setInitialized(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { user: loggedInUser, token: issuedToken } = await apiLogin(email, password);
      setUser(loggedInUser);
      setToken(issuedToken);
      localStorage.setItem(STORAGE_TOKEN_KEY, issuedToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(loggedInUser));
      return loggedInUser;
    } catch (err: any) {
      // FastAPI returns { detail: "..." } for both 401 (bad credentials)
      // and 403 (deactivated account) — surface that message as-is.
      const message = err?.response?.data?.detail || "Login failed. Check your credentials.";
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: !!token, login, logout }),
    [user, token, login, logout]
  );

  if (!initialized) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
