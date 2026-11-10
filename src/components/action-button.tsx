"use client";

import Button, { type ButtonProps } from "@mui/material/Button";

function plain(color: string) {
  return {
    color,
    bgcolor: "transparent",
    boxShadow: "none",
    "&:hover, &:focus, &.Mui-focusVisible": { bgcolor: "transparent" },
  };
}

const tones = {
  primary: plain("var(--mui-palette-primary-main)"),
  error: plain("var(--mui-palette-error-main)"),
  neutral: {
    color: "text.primary",
    bgcolor: "var(--mui-palette-background-paper)",
    boxShadow: "inset 0 0 0 1px var(--mui-palette-divider)",
    "&:hover": { bgcolor: "var(--mui-palette-action-hover)" },
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
          backgroundImage: "none",
          "&.Mui-disabled": { opacity: 0.45 },
        },
        tones[tone],
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}
