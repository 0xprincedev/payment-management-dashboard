"use client";

import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import IconButton from "@mui/material/IconButton";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function RefreshWidgetButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <IconButton
      type="button"
      aria-label="Refresh"
      size="small"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      sx={{
        position: "absolute",
        top: { xs: 10, sm: 12 },
        right: { xs: 10, sm: 12 },
        color: "text.secondary",
      }}
    >
      <RefreshOutlinedIcon
        fontSize="small"
        sx={
          pending
            ? { animation: "spin 0.8s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }
            : undefined
        }
      />
    </IconButton>
  );
}
