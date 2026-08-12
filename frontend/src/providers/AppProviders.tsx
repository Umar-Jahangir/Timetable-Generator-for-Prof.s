"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import ThemeRegistry from "../theme/ThemeRegistry";
import { AuthProvider } from "../hooks/useAuth";

/**
 * NEW vs. CRA: CRA's App.tsx nested <ThemeProvider> -> <BrowserRouter> ->
 * <AuthProvider> -> <AppRoutes> directly, since everything was one client
 * bundle. In the App Router, routing is file-based (no <BrowserRouter>
 * needed at all — see src/app/**), so this file only owns the providers
 * that used to wrap the router: theme, data-fetching client, and auth.
 *
 * QueryClient is created with `useState(() => new QueryClient())` rather
 * than as a module-level constant — creating it during render (once, via
 * the lazy initializer) avoids sharing one client across different users'
 * requests during server-side rendering.
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeRegistry>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeRegistry>
  );
}
