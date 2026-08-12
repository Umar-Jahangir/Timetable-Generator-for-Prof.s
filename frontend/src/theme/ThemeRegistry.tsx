"use client";

import * as React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import theme from "./theme";

/**
 * WHY THIS FILE EXISTS (new vs. CRA):
 * In CRA, `<ThemeProvider>` + `<CssBaseline>` could sit directly in
 * `App.tsx` because everything rendered client-side. Next.js's App
 * Router renders on the server first, and MUI's styling engine
 * (Emotion) needs special handling to inject styles correctly during
 * server-side rendering — without it you get a "flash of unstyled
 * content" and hydration mismatches.
 *
 * `AppRouterCacheProvider` (from the official `@mui/material-nextjs`
 * package) sets up Emotion's cache for the App Router's streaming SSR
 * model. It must wrap `ThemeProvider`, and this whole file must be a
 * Client Component (`"use client"`) since it uses React context.
 */
export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
