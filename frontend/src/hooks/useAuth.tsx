"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../lib/api";
import { setCookie, getCookie, deleteCookie } from "../lib/cookies";
import { AuthState, User } from "../types";

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_COOKIE = "smartsched_token";
const USER_COOKIE = "smartsched_user";

// Shape returned by POST /api/v1/auth/login (see backend/app/schemas/auth.py::TokenResponse).
// Unchanged — this is the same backend as Phase 3, no API contract changes.
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

async function loginRequest(email: string, password: string): Promise<LoginApiResponse> {
  const { data } = await api.post<LoginApiResponse>("/auth/login", { email, password });
  return data;
}

/**
 * CHANGED FROM CRA: `next lint` (which `next build` runs automatically —
 * CRA's build script did not) enforces `@typescript-eslint/no-explicit-any`
 * by default via `eslint-config-next`. A loose `err: any` + optional
 * chaining, which worked fine in CRA, now fails the build. This type
 * guard narrows `unknown` to the specific axios error shape we care
 * about instead.
 */
function isAxiosErrorWithDetail(err: unknown): err is { response: { data: { detail: string } } } {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: unknown }).response === "object"
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Hydrate from cookies on mount. This runs client-side only (useEffect
  // never runs during SSR), so there's no server/client markup mismatch.
  useEffect(() => {
    const storedUser = getCookie(USER_COOKIE);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        deleteCookie(TOKEN_COOKIE);
        deleteCookie(USER_COOKIE);
      }
    }
    setInitialized(true);
  }, []);

  /**
   * NEW vs. CRA: login is now a TanStack Query `useMutation` instead of a
   * hand-rolled async function + local loading/error state. This gives us
   * `isPending` (loading), automatic error capture, and a consistent
   * pattern other data-mutating actions (Phase 4+) will follow.
   */
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginRequest(email, password),
  });

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const data = await mutation.mutateAsync({ email, password });
      const loggedInUser: User = {
        id: data.user.user_id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };
      setCookie(TOKEN_COOKIE, data.access_token, data.expires_in_minutes * 60);
      setCookie(USER_COOKIE, JSON.stringify(loggedInUser), data.expires_in_minutes * 60);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err: unknown) {
      // FastAPI returns { detail: "..." } for both 401 (bad credentials)
      // and 403 (deactivated account) — surface that message as-is.
      const message = isAxiosErrorWithDetail(err)
        ? err.response.data.detail
        : "Login failed. Check your credentials.";
      throw new Error(message);
    }
  };

  const logout = () => {
    setUser(null);
    deleteCookie(TOKEN_COOKIE);
    deleteCookie(USER_COOKIE);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
      isLoggingIn: mutation.isPending,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, mutation.isPending]
  );

  if (!initialized) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
