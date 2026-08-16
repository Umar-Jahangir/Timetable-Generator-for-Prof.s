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
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg);
          return null;
        })
        .filter((message): message is string => Boolean(message));
      if (messages.length) return messages.join(" ");
    }
  }
  return fallback;
}
