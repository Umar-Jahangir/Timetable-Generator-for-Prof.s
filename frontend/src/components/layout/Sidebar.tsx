"use client";

import React from "react";
import { Box, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { palette } from "../../theme/theme";

export interface NavItem {
  label: string;
  path: string;
}

interface SidebarProps {
  items: NavItem[];
  brandSubtitle: string;
}

/**
 * CHANGED FROM CRA: react-router's <NavLink> (which applied an "active"
 * class automatically) is replaced by next/link's <Link>, combined with
 * the usePathname() hook to compute the active state manually. This file
 * must be a Client Component ("use client") because usePathname is a
 * client-side hook.
 */
const Sidebar: React.FC<SidebarProps> = ({ items, brandSubtitle }) => {
  const pathname = usePathname();

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
        {items.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              href={item.path}
              selected={isActive}
              sx={{
                borderBottom: `1px solid ${palette.divider}`,
                color: isActive ? palette.border : palette.textDim,
                fontFamily: "var(--font-jetbrains-mono), monospace",
                borderLeft: isActive ? `2px solid ${palette.border}` : "2px solid transparent",
                "&.Mui-selected": {
                  backgroundColor: "rgba(63,208,224,0.08)",
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "rgba(63,208,224,0.12)",
                },
                "&:hover": {
                  backgroundColor: "rgba(63,208,224,0.05)",
                },
              }}
            >
              <ListItemText
                slotProps={{ primary: { sx: { fontSize: 14 } } }}
                primary={item.label}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};

export default Sidebar;
