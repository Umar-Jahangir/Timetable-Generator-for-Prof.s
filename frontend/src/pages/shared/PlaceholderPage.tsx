import React from "react";
import { Typography } from "@mui/material";
import ConsolePanel from "../../components/common/ConsolePanel";
import { palette } from "../../theme/theme";

interface PlaceholderPageProps {
  title: string;
  phase: string;
}

/**
 * Placeholder for screens whose real implementation belongs to a later
 * phase (Admin Module = Phase 4, Faculty Module = Phase 5, Timetable
 * Engine = Phase 6, Analytics = Phase 8, ...). Keeping the route + nav
 * link live now means the navigation shell built in Phase 1 never has
 * to change shape later — only the page content gets filled in.
 */
const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, phase }) => (
  <ConsolePanel title={title}>
    <Typography variant="body2" sx={{ color: palette.textDim }}>
      This module is built out in <span style={{ color: palette.accent }}>{phase}</span>. The route,
      navigation link, and layout are already wired up.
    </Typography>
  </ConsolePanel>
);

export default PlaceholderPage;
