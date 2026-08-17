import { createTheme } from "@mui/material/styles";

/**
 * SmartSched AI — "Terminal Console" design system
 *
 * Visual direction is taken directly from the product wireframes:
 * a near-black console surface, thin cyan box-drawing borders,
 * monospace type throughout, and a warm amber accent reserved for
 * AI/assistant output and calls to attention.
 */

export const palette = {
  bg: "#0a0d0e",
  surface: "#0e1315",
  surfaceRaised: "#121819",
  border: "#3fd0e0",
  borderDim: "#1f4a4f",
  text: "#e8f6f8",
  textDim: "#7fa8ac",
  accent: "#f0a860", // amber — assistant / AI highlights
  accentDim: "#8a6a3f",
  success: "#5fe3a0",
  danger: "#f26d6d",
  warning: "#f5d76e", // yellow — extra / ad-hoc lectures
  divider: "#1c2628",
};

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: palette.bg,
      paper: palette.surface,
    },
    primary: {
      main: palette.border,
      contrastText: palette.bg,
    },
    secondary: {
      main: palette.accent,
      contrastText: palette.bg,
    },
    success: { main: palette.success },
    error: { main: palette.danger },
    text: {
      primary: palette.text,
      secondary: palette.textDim,
    },
    divider: palette.divider,
  },
  typography: {
    fontFamily: "var(--font-jetbrains-mono), monospace",
    h1: { fontFamily: "var(--font-space-grotesk), monospace", fontWeight: 700, letterSpacing: 1 },
    h2: { fontFamily: "var(--font-space-grotesk), monospace", fontWeight: 700, letterSpacing: 1 },
    h3: { fontFamily: "var(--font-space-grotesk), monospace", fontWeight: 600, letterSpacing: 0.5 },
    h4: { fontFamily: "var(--font-space-grotesk), monospace", fontWeight: 600 },
    h5: { fontFamily: "var(--font-space-grotesk), monospace", fontWeight: 600 },
    h6: { fontFamily: "var(--font-space-grotesk), monospace", fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0.5 },
  },
  shape: {
    borderRadius: 2,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.bg,
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(63,208,224,0.05), transparent 60%)",
        },
        "::selection": {
          backgroundColor: palette.border,
          color: palette.bg,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${palette.borderDim}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: `1px solid ${palette.border}`,
        },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundColor: "transparent",
            color: palette.border,
            "&:hover": {
              backgroundColor: "rgba(63,208,224,0.1)",
            },
          },
        },
      ],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: "var(--font-jetbrains-mono), monospace",
        },
        notchedOutline: {
          borderColor: palette.borderDim,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: "var(--font-jetbrains-mono), monospace",
        },
      },
    },
  },
});

export default theme;
