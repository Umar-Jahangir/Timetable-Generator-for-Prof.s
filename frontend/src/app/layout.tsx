import type { Metadata } from "next";
import { jetbrainsMono, spaceGrotesk } from "../theme/fonts";
import AppProviders from "../providers/AppProviders";

/**
 * NEW vs. CRA: CRA had a static public/index.html with a hardcoded
 * <title> and <meta description>. Next.js generates <head> content from
 * this exported `metadata` object instead — no separate HTML file.
 */
export const metadata: Metadata = {
  title: "SmartSched AI",
  description:
    "SmartSched AI — Intelligent Academic Timetable Generation and Dynamic Scheduling Assistant",
};

/**
 * This is the App Router's single entry point (replaces CRA's
 * public/index.html + src/index.tsx). It's a Server Component by
 * default — the actual client-side providers live in AppProviders,
 * which is the first "use client" boundary in the tree.
 */
/**
 * NOTE: suppressHydrationWarning on <html> is intentional and narrow —
 * it only silences mismatch warnings for attributes on this exact
 * element, not for its children or any other hydration issue. This is
 * the officially recommended fix for a specific false-positive: browser
 * extensions (password managers, ad blockers, etc.) often inject
 * attributes like `data-*` or `suppresshydrationwarning` directly into
 * `<html>` before React hydrates, which then looks like a server/client
 * mismatch even though nothing in our code caused it. See:
 * https://nextjs.org/docs/messages/react-hydration-error
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
