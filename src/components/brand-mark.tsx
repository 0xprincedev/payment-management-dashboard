import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function BrandMark({ onDark = false }: { onDark?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: "10px",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        P
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="p"
          sx={{
            fontWeight: 700,
            lineHeight: 1.15,
            color: onDark ? "#fff" : "text.primary",
          }}
        >
          Payments
        </Typography>
        <Typography
          component="p"
          sx={{
            mt: 0.25,
            fontSize: 12,
            lineHeight: 1.2,
            color: onDark ? "rgba(225, 222, 245, 0.65)" : "text.secondary",
          }}
        >
          Management
        </Typography>
      </Box>
    </Box>
  );
}
