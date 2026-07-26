import React from "react";
import { Box, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";
import { palette } from "../../theme/theme";

export interface NavItem {
  label: string;
  path: string;
}

interface SidebarProps {
  items: NavItem[];
  brandSubtitle: string;
}

const Sidebar: React.FC<SidebarProps> = ({ items, brandSubtitle }) => {
  return (
    <Box
      component="nav"
      sx={{
        width: 220,
        flexShrink: 0,
        borderRight: `1px solid ${palette.borderDim}`,
        backgroundColor: palette.surface,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${palette.borderDim}` }}>
        <Typography sx={{ color: palette.border, fontWeight: 700, letterSpacing: 1 }}>
          SmartSched AI
        </Typography>
        <Typography variant="caption" sx={{ color: palette.textDim }}>
          {brandSubtitle}
        </Typography>
      </Box>
      <List sx={{ py: 0 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            sx={{
              borderBottom: `1px solid ${palette.divider}`,
              color: palette.textDim,
              fontFamily: '"JetBrains Mono", monospace',
              "&.active": {
                color: palette.border,
                backgroundColor: "rgba(63,208,224,0.08)",
                borderLeft: `2px solid ${palette.border}`,
              },
              "&:hover": {
                backgroundColor: "rgba(63,208,224,0.05)",
              },
            }}
          >
            <ListItemText primaryTypographyProps={{ fontSize: 14 }} primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;
