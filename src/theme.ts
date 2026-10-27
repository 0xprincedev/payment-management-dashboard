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
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'var(--font-public-sans), "Public Sans", Helvetica, Arial, sans-serif',
    h4: { fontWeight: 600, fontSize: "1.75rem" },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
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
          border: "1px solid var(--mui-palette-divider)",
          boxShadow: "0 2px 8px rgba(47, 43, 61, 0.06)",
        },
      },
    },
    MuiTableContainer: {
      defaultProps: { component: "div" },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(115, 103, 240, 0.08)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: "var(--mui-palette-text-secondary)",
          borderColor: "var(--mui-palette-divider)",
        },
        root: { borderColor: "var(--mui-palette-divider)" },
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
        root: { borderRadius: 8 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12 },
      },
    },
  },
});

export default theme;
