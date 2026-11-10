import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import type { ReactNode } from "react";
import BrandMark from "@/components/brand-mark";
import ColorModeToggle from "@/components/color-mode-toggle";

export default function AuthShell({
  children,
  maxWidth = 440,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: { xs: 4, sm: 6 },
        bgcolor: "background.default",
        color: "text.primary",
        backgroundImage: "radial-gradient(900px 420px at 50% -80px, rgba(115, 103, 240, 0.16), transparent 70%)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth,
          height: "fit-content",
          p: { xs: 3, sm: 4 },
          borderRadius: "16px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 3 }}>
          <BrandMark />
          <ColorModeToggle />
        </Box>
        {children}
      </Paper>
    </Box>
  );
}
