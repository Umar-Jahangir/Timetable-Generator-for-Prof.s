import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { palette } from "../../theme/theme";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
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
      <Button variant="outlined" color="primary" onClick={() => navigate("/login")}>
        [ Back to Login ]
      </Button>
    </Box>
  );
};

export default NotFound;
