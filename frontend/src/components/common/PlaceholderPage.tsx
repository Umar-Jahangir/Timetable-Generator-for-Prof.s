import { Typography } from "@mui/material";
import ConsolePanel from "./ConsolePanel";
import { palette } from "../../theme/theme";

interface PlaceholderPageProps {
  title: string;
  phase: string;
}

/**
 * UNCHANGED IN SPIRIT FROM CRA — still a pure presentational component,
 * still a Server Component candidate (no hooks). Moved from
 * `pages/shared/PlaceholderPage.tsx` to `components/common/` since the
 * App Router's `pages/` naming would collide with Next.js's legacy
 * Pages Router convention — see the migration notes for why `pages/` as
 * a folder name is avoided entirely in this project now.
 */
export default function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <ConsolePanel title={title}>
      <Typography variant="body2" sx={{ color: palette.textDim }}>
        This module is built out in <span style={{ color: palette.accent }}>{phase}</span>. The
        route, navigation link, and layout are already wired up.
      </Typography>
    </ConsolePanel>
  );
}
