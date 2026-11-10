"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-mui-color-scheme",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#7367F0" },
        secondary: { main: "#808390" },
        success: { main: "#28C76F" },
        info: { main: "#00BAD1" },
        warning: { main: "#FF9F43" },
        error: { main: "#FF4C51" },
        background: { default: "#F8F7FA", paper: "#FFFFFF" },
        text: {
          primary: "rgba(47, 43, 61, 0.9)",
          secondary: "rgba(47, 43, 61, 0.68)",
        },
        divider: "rgba(47, 43, 61, 0.12)",
      },
    },
    dark: {
      palette: {
        primary: { main: "#7367F0" },
        secondary: { main: "#808390" },
        success: { main: "#28C76F" },
        info: { main: "#00BAD1" },
        warning: { main: "#FF9F43" },
        error: { main: "#FF4C51" },
        background: { default: "#25293C", paper: "#2F3349" },
        text: {
          primary: "rgba(225, 222, 245, 0.9)",
          secondary: "rgba(225, 222, 245, 0.68)",
        },
        divider: "rgba(225, 222, 245, 0.12)",
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'var(--font-public-sans), "Public Sans", Helvetica, Arial, sans-serif',
    h4: { fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.025em", lineHeight: 1.25 },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 700, letterSpacing: "-0.015em" },
    subtitle1: { fontWeight: 600, letterSpacing: "-0.01em" },
    body2: { lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: "-0.01em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: "none" },
        contained: { "&:hover": { boxShadow: "none" } },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: 12,
          border: "1px solid var(--mui-palette-divider)",
          boxShadow: "0 1px 2px rgba(47, 43, 61, 0.04), 0 10px 28px rgba(47, 43, 61, 0.04)",
        },
      },
    },
    MuiTableContainer: {
      defaultProps: { component: "div" },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: "#F4F3F8",
          ...theme.applyStyles("dark", {
            backgroundColor: "#383C54",
          }),
        }),
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          "& .MuiTableRow-root:hover": {
            backgroundColor: "var(--mui-palette-action-hover)",
          },
          "& .MuiTableRow-root:last-child .MuiTableCell-root": {
            borderBottom: 0,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "var(--mui-palette-divider)",
          fontVariantNumeric: "tabular-nums",
        },
        head: ({ theme }) => ({
          fontWeight: 600,
          fontSize: "0.75rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--mui-palette-text-secondary)",
          borderColor: "var(--mui-palette-divider)",
          backgroundColor: "#F4F3F8",
          ...theme.applyStyles("dark", {
            backgroundColor: "#383C54",
          }),
        }),
        sizeSmall: {
          paddingTop: 11,
          paddingBottom: 11,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          letterSpacing: "-0.01em",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: "0 24px 48px rgba(47, 43, 61, 0.16)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, letterSpacing: "-0.02em" },
      },
    },
  },
});

export default theme;
