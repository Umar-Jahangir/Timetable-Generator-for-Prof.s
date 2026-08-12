import React from "react";
import { Box, SxProps, Theme } from "@mui/material";
import { palette } from "../../theme/theme";

interface ConsolePanelProps {
  title?: string;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  dense?: boolean;
}

/**
 * UNCHANGED FROM CRA — this is a pure presentational component with no
 * hooks, no routing, no browser-only APIs. It doesn't need a "use client"
 * directive of its own; when it's imported into a Client Component
 * (which every page using it currently is), Next.js includes it in the
 * client bundle automatically. If a future Server Component page wants
 * to render it directly, it still works with zero changes.
 */
const ConsolePanel: React.FC<ConsolePanelProps> = ({ title, children, sx, dense }) => {
  return (
    <Box
      sx={{
        position: "relative",
        border: `1px solid ${palette.borderDim}`,
        borderRadius: 0,
        backgroundColor: palette.surface,
        p: dense ? 2 : 3,
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          width: 10,
          height: 10,
          borderColor: palette.border,
        },
        "&::before": {
          top: -1,
          left: -1,
          borderTop: `2px solid ${palette.border}`,
          borderLeft: `2px solid ${palette.border}`,
        },
        "&::after": {
          bottom: -1,
          right: -1,
          borderBottom: `2px solid ${palette.border}`,
          borderRight: `2px solid ${palette.border}`,
        },
        ...sx,
      }}
    >
      {title && (
        <Box
          component="span"
          sx={{
            position: "absolute",
            top: -11,
            left: 16,
            backgroundColor: palette.surface,
            px: 1,
            fontSize: 12,
            letterSpacing: 1,
            color: palette.border,
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          [ {title.toUpperCase()} ]
        </Box>
      )}
      {children}
    </Box>
  );
};

export default ConsolePanel;
