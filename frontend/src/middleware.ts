import { NextRequest, NextResponse } from "next/server";

/**
 * NEW — HAS NO CRA EQUIVALENT.
 *
 * CRA was a single client-side bundle: there was no way to intercept a
 * request before the page rendered, so <ProtectedRoute> always had to
 * mount first and redirect after the fact (a brief flash of blank
 * screen). Next.js middleware runs on the server/edge before any page
 * renders, so we can redirect unauthenticated users straight away.
 *
 * IMPORTANT LIMITATION (documented honestly): this middleware only
 * checks whether the `smartsched_token` cookie is *present* and does a
 * best-effort decode of its payload to read the `role` claim — it does
 * NOT verify the JWT signature. Verifying an HS256 signature here would
 * require either the `jose` package (Edge-runtime compatible, unlike
 * `jsonwebtoken`) or switching to Node.js middleware runtime, plus
 * shipping the JWT secret to the frontend's server environment. Since
 * the actual authorization boundary is (and must remain) the FastAPI
 * backend — which verifies every token on every request — this
 * middleware is a UX optimization (skip rendering a page the user can't
 * use) rather than a security control. `RequireRole` in each layout is
 * the real gatekeeper on the client, and the backend is the real
 * gatekeeper for data.
 */

function decodeRole(token: string): "admin" | "faculty" | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("smartsched_token")?.value;
  const role = token ? decodeRole(token) : null;

  const isAdminRoute = pathname.startsWith("/admin");
  const isFacultyRoute = pathname.startsWith("/faculty");
  const isLoginRoute = pathname === "/login";

  // No token, trying to reach a protected section -> bounce to login.
  if ((isAdminRoute || isFacultyRoute) && !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in but hitting the wrong section -> send to their own dashboard.
  if (isAdminRoute && role === "faculty") {
    return NextResponse.redirect(new URL("/faculty", request.url));
  }
  if (isFacultyRoute && role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Already logged in, revisiting /login -> go straight to their dashboard.
  if (isLoginRoute && role) {
    return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/faculty", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/faculty/:path*", "/login"],
};
