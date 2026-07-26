import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthState, User, UserRole } from "../types";

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_TOKEN_KEY = "smartsched_token";
const STORAGE_USER_KEY = "smartsched_user";

/**
 * NOTE (Phase 1 scope):
 * The real authentication flow (JWT issued by FastAPI, verified against
 * MySQL) is built in Phase 3 - Authentication. For now this provider
 * exposes the exact same interface the rest of the app will consume,
 * backed by a mock login so every screen and route guard can be wired
 * up and tested end-to-end today. Swapping the mock for `api.post(...)`
 * in Phase 3 will not require touching any consuming component.
 */
function mockLogin(email: string, password: string): Promise<{ user: User; token: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!email || !password) {
        reject(new Error("Email and password are required."));
        return;
      }
      const role: UserRole = email.toLowerCase().includes("admin") ? "admin" : "faculty";
      const user: User = {
        id: 1,
        name: role === "admin" ? "HOD Admin" : "Prof. John Smith",
        email,
        role,
        department: "Computer Engineering",
      };
      resolve({ user, token: "mock-jwt-token" });
    }, 500);
  });
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
    const { user: loggedInUser, token: issuedToken } = await mockLogin(email, password);
    setUser(loggedInUser);
    setToken(issuedToken);
    localStorage.setItem(STORAGE_TOKEN_KEY, issuedToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(loggedInUser));
    return loggedInUser;
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
