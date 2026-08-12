/**
 * Small client-side cookie helper.
 *
 * WHY COOKIES INSTEAD OF localStorage (this is new vs. the CRA version):
 * Next.js middleware (src/middleware.ts) runs on the server/edge, before
 * any page renders — it has no access to localStorage, which only exists
 * in the browser. Cookies are sent with every request, so middleware can
 * read them and redirect unauthenticated users before the page even
 * starts rendering (no flash of protected content, no client-side-only
 * redirect flicker).
 *
 * SECURITY NOTE: this cookie is NOT httpOnly, because the Axios client
 * also needs to read it in the browser to attach the Authorization
 * header (the backend expects `Authorization: Bearer <token>`, not a
 * cookie — that part of the API is unchanged). That means it's readable
 * by any JS on the page, same exposure localStorage had. This is a
 * pragmatic middle ground given "no backend changes" — a production
 * hardening pass would move to a backend-set httpOnly cookie + a
 * same-site proxy route, which does require backend changes and is out
 * of scope here.
 */

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}
