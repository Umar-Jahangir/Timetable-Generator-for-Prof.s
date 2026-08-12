"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { UserRole } from "../../types";

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * CHANGED FROM CRA: react-router's <ProtectedRoute> wrapped individual
 * <Route> elements and used <Navigate> to redirect, all resolved
 * synchronously during render inside a single-page client app.
 *
 * The App Router has no equivalent "wrap this route element" API —
 * instead, this component is rendered inside each section's layout.tsx
 * (src/app/admin/layout.tsx, src/app/faculty/layout.tsx) and redirects
 * imperatively via next/navigation's useRouter in a useEffect, since
 * middleware.ts (the App Router's usual first line of defense) can only
 * check for a token's *presence*, not decode/verify it without adding a
 * server-side JWT library — this component is the final, authoritative
 * client-side check using the already-decoded user object from
 * useAuth().
 *
 * Middleware still helps: it redirects unauthenticated requests before
 * this component's JS even loads, avoiding a flash of the protected
 * layout. This component is the fallback/defense-in-depth layer, and the
 * one that actually knows the user's role.
 */
const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(user.role === "admin" ? "/admin" : "/faculty");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

export default RequireRole;
