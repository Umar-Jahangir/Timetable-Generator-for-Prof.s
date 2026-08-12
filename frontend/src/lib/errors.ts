import axios from "axios";

/**
 * FastAPI returns errors as `{ detail: "..." }`. This extracts that
 * message from an Axios error safely — `unknown` + `axios.isAxiosError`
 * type-narrows without resorting to `any`, which ESLint's
 * `@typescript-eslint/no-explicit-any` (enabled via eslint-config-next)
 * flags as an error, not just a warning.
 */
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}
