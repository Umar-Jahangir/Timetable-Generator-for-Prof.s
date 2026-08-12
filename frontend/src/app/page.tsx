import { redirect } from "next/navigation";

/**
 * CHANGED FROM CRA: the CRA version had `<Route path="/" element={<Navigate to="/login" replace />} />`
 * as one line inside AppRoutes. In the App Router, `/` is its own file,
 * and `redirect()` from `next/navigation` is a Server Component-safe
 * redirect — this file needs no "use client" directive at all.
 */
export default function RootPage() {
  redirect("/login");
}
