"use client";

import { Box, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { palette } from "../theme/theme";

/**
 * CHANGED FROM CRA: react-router needed an explicit `<Route path="*">`
 * at the end of the route tree. Next.js has a file convention for
 * this — any file named `not-found.tsx` at the app root (or inside a
 * route segment, for scoped 404s) is rendered automatically whenever a
 * route doesn't match, or when `notFound()` is called explicitly.
 */
export default function NotFound() {
  const router = useRouter();
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        backgroundColor: palette.bg,
      }}
    >
      <Typography sx={{ color: palette.border, fontSize: 48, fontWeight: 700 }}>404</Typography>
      <Typography sx={{ color: palette.textDim }}>Route not found in the console.</Typography>
      <Button variant="outlined" color="primary" onClick={() => router.push("/login")}>
        [ Back to Login ]
      </Button>
    </Box>
  );
}
