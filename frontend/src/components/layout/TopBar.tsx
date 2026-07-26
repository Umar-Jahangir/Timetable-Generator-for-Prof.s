import React, { useState } from "react";
import { Box, Typography, IconButton, Menu, MenuItem, Divider } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LogoutIcon from "@mui/icons-material/Logout";
import { palette } from "../../theme/theme";
import { useAuth } from "../../hooks/useAuth";

interface TopBarProps {
  pageTitle: string;
}

const TopBar: React.FC<TopBarProps> = ({ pageTitle }) => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${palette.borderDim}`,
        px: 3,
        py: 2,
      }}
    >
      <Typography variant="h6" sx={{ color: palette.text, letterSpacing: 0.5 }}>
        {pageTitle}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton size="small" sx={{ color: palette.textDim }}>
          <NotificationsNoneIcon fontSize="small" />
        </IconButton>

        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 1 }}
        >
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            {user?.role === "admin" ? "Admin" : "Faculty"}: <span style={{ color: palette.text }}>{user?.name}</span>
          </Typography>
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem disabled>{user?.email}</MenuItem>
          <Divider />
          <MenuItem onClick={logout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default TopBar;
