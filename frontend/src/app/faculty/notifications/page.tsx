"use client";

import React from "react";
import { Box, Button, Typography } from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import { palette } from "../../../theme/theme";
import { useMarkNotificationRead, useNotifications } from "../../../hooks/useFacultyApi";

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <ConsolePanel title="Notifications">
      {isLoading && (
        <Typography variant="body2" sx={{ color: palette.textDim }}>
          Loading...
        </Typography>
      )}
      {!isLoading && notifications.length === 0 && (
        <Typography variant="body2" sx={{ color: palette.textDim }}>
          No notifications yet.
        </Typography>
      )}
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {notifications.map((n, idx) => (
          <Box
            key={n.notification_id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              py: 1.5,
              borderBottom: idx < notifications.length - 1 ? `1px solid ${palette.divider}` : "none",
              opacity: n.is_read ? 0.55 : 1,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: n.is_read ? palette.textDim : palette.text }}>
                {n.is_read ? "" : "✓ "}
                {n.title}
              </Typography>
              {n.detail && (
                <Typography variant="caption" sx={{ color: palette.textDim }}>
                  {n.detail}
                </Typography>
              )}
            </Box>
            {!n.is_read && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => markRead.mutate(n.notification_id)}
                disabled={markRead.isPending}
              >
                Mark read
              </Button>
            )}
          </Box>
        ))}
      </Box>
    </ConsolePanel>
  );
}
