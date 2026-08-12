import axios from "axios";
import { getCookie, deleteCookie } from "./cookies";

/**
 * Central axios instance for all backend calls.
 *
 * CHANGED FROM CRA: environment variables must be prefixed
 * `NEXT_PUBLIC_` to be exposed to the browser bundle in Next.js
 * (`REACT_APP_*` was the CRA convention and no longer does anything
 * here). See .env.example.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT (if present) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = getCookie("smartsched_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized 401 handling — bounce back to login if the token expires.
// CHANGED FROM CRA: `window.location.href` still works in Next.js, but
// only inside Client Components / browser code paths — this interceptor
// only ever runs in the browser (axios calls are triggered from Client
// Components), so it's safe as-is.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      deleteCookie("smartsched_token");
      deleteCookie("smartsched_user");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
