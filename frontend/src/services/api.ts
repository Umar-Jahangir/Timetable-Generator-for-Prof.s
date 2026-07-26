import axios from "axios";

/**
 * Central axios instance for all backend calls.
 * Base URL comes from the environment so it can point at
 * localhost during development and a real host in production.
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT (if present) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("smartsched_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized 401 handling — bounce back to login if the token expires.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("smartsched_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
