import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "flex-end" },
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 640, lineHeight: 1.65 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Box>
  );
}
