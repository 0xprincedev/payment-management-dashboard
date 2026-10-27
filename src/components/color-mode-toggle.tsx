"use client";

import { useEffect, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useAppColorScheme } from "@/components/ThemeRegistry";

export default function ColorModeToggle({ onDark = false }: { onDark?: boolean }) {
  const { mode, systemMode, setMode } = useAppColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const resolved = mode === "system" ? systemMode : mode;
  const dark = ready && resolved === "dark";

  return (
    <Box
      role="group"
      aria-label="Theme"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        p: 0.25,
        borderRadius: "999px",
        bgcolor: onDark ? "rgba(225, 222, 245, 0.08)" : "action.hover",
        visibility: ready ? "visible" : "hidden",
      }}
    >
      <ModeButton
        selected={!dark}
        label="Light theme"
        onDark={onDark}
        onClick={() => setMode("light")}
      >
        <LightModeOutlinedIcon sx={{ fontSize: 16 }} />
      </ModeButton>
      <ModeButton
        selected={dark}
        label="Dark theme"
        onDark={onDark}
        onClick={() => setMode("dark")}
      >
        <DarkModeOutlinedIcon sx={{ fontSize: 16 }} />
      </ModeButton>
    </Box>
  );
}

function ModeButton({
  selected,
  label,
  onDark,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  onDark: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        width: 28,
        height: 28,
        p: 0,
        display: "grid",
        placeItems: "center",
        border: 0,
        borderRadius: "50%",
        cursor: "pointer",
        color: selected ? "primary.contrastText" : onDark ? "rgba(225, 222, 245, 0.72)" : "text.secondary",
        bgcolor: selected ? "primary.main" : "transparent",
        "&:hover": {
          bgcolor: selected ? "primary.main" : onDark ? "rgba(225, 222, 245, 0.08)" : "action.selected",
        },
      }}
    >
      {children}
    </Box>
  );
}
