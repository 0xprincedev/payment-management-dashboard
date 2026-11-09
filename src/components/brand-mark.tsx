import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function BrandMark({ onDark = false }: { onDark?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <Box sx={{ width: 40, height: 40, flexShrink: 0, lineHeight: 0 }}>
        <Box
          component="img"
          src="/bitcoin.png"
          alt=""
          aria-hidden
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
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
