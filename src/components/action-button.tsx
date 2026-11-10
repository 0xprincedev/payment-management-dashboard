"use client";

import Button, { type ButtonProps } from "@mui/material/Button";

const tones = {
  primary: {
    color: "primary.main",
    bgcolor: "rgba(115, 103, 240, 0.12)",
    "&:hover": { bgcolor: "rgba(115, 103, 240, 0.2)" },
  },
  error: {
    color: "error.main",
    bgcolor: "rgba(255, 76, 81, 0.12)",
    "&:hover": { bgcolor: "rgba(255, 76, 81, 0.2)" },
  },
  neutral: {
    color: "text.primary",
    bgcolor: "action.hover",
    "&:hover": { bgcolor: "action.selected" },
  },
} as const;

export default function ActionButton({
  tone = "primary",
  sx,
  ...props
}: ButtonProps & { tone?: keyof typeof tones }) {
  return (
    <Button
      type="button"
      size="small"
      {...props}
      sx={[
        {
          minWidth: 0,
          px: 1.15,
          py: 0.4,
          borderRadius: "8px",
          fontWeight: 600,
          lineHeight: 1.4,
          "&.Mui-disabled": { opacity: 0.45 },
        },
        tones[tone],
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}
