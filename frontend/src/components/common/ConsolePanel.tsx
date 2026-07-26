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
 * ConsolePanel is the signature visual element of SmartSched AI:
 * a thin cyan-bordered "console window" with bracket corners and an
 * optional bracketed title, e.g. "[ TIMETABLE ]". Every screen in the
 * product is composed from one or more of these panels, echoing the
 * terminal-dashboard language of the original wireframes.
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
            fontFamily: '"JetBrains Mono", monospace',
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
