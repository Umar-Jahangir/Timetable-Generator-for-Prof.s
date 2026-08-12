import React from "react";
import { Box, Typography } from "@mui/material";
import { palette } from "../../theme/theme";

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

// UNCHANGED FROM CRA — no hooks, no routing, no browser APIs.
const StatCard: React.FC<StatCardProps> = ({ label, value, accent }) => (
  <Box
    sx={{
      border: `1px solid ${palette.borderDim}`,
      p: 2,
      minWidth: 120,
      flex: "1 1 120px",
    }}
  >
    <Typography variant="caption" sx={{ color: palette.textDim, letterSpacing: 0.5 }}>
      {label}
    </Typography>
    <Typography
      variant="h4"
      sx={{ color: accent ? palette.accent : palette.text, fontWeight: 700, mt: 0.5 }}
    >
      {value}
    </Typography>
  </Box>
);

export default StatCard;
