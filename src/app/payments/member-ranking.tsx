import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

type RankedMember = {
  id: number;
  nickname: string;
  payments: { amountCents: number }[];
};

const crowns = [
  { id: "rank-crown-gold", light: "#FFE38A", mid: "#F0B429", deep: "#B8860B" },
  { id: "rank-crown-silver", light: "#F7F8FA", mid: "#C5CCD6", deep: "#7E8794" },
  { id: "rank-crown-bronze", light: "#F3C7A2", mid: "#C9844A", deep: "#8A4B24" },
];

function Crown({ metal }: { metal: (typeof crowns)[number] }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      aria-hidden
      sx={{ width: 26, height: 26, display: "block" }}
    >
      <defs>
        <linearGradient id={metal.id} x1="4" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.48" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.deep} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${metal.id})`}
        stroke={metal.deep}
        strokeWidth="0.6"
        strokeLinejoin="round"
        d="M4.6 9.1 8.7 13.1 12 4.4 15.3 13.1 19.4 9.1 20.7 16.8H3.3Z"
      />
      <circle cx="4.6" cy="8.2" r="1.7" fill={`url(#${metal.id})`} stroke={metal.deep} strokeWidth="0.5" />
      <circle cx="12" cy="3.6" r="1.85" fill={`url(#${metal.id})`} stroke={metal.deep} strokeWidth="0.5" />
      <circle cx="19.4" cy="8.2" r="1.7" fill={`url(#${metal.id})`} stroke={metal.deep} strokeWidth="0.5" />
      <rect x="3.1" y="16.7" width="17.8" height="3.3" rx="1" fill={`url(#${metal.id})`} stroke={metal.deep} strokeWidth="0.5" />
      <circle cx="4.2" cy="7.6" r="0.45" fill="#fff" opacity="0.85" />
      <circle cx="11.5" cy="3" r="0.5" fill="#fff" opacity="0.9" />
      <circle cx="19" cy="7.6" r="0.45" fill="#fff" opacity="0.85" />
    </Box>
  );
}

export default function MemberRanking({
  members,
  currentUserId,
}: {
  members: RankedMember[];
  currentUserId: number;
}) {
  const ranked = members
    .map((member) => ({
      id: member.id,
      nickname: member.nickname,
      totalCents: member.payments.reduce((sum, payment) => sum + payment.amountCents, 0),
    }))
    .sort(
      (left, right) =>
        right.totalCents - left.totalCents ||
        left.nickname.localeCompare(right.nickname, undefined, { sensitivity: "accent" }) ||
        left.id - right.id,
    );

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 3,
        width: { xs: "100%", md: 240 },
        flexShrink: 0,
        position: { md: "sticky" },
        top: { md: 32 },
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: "rgba(115, 103, 240, 0.08)",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          Ranking
        </Typography>
      </Box>
      <Box component="ol" sx={{ m: 0, p: 1, listStyle: "none", display: "flex", flexDirection: "column", gap: 0.5 }}>
        {ranked.map((member, index) => {
          const current = member.id === currentUserId;
          const crown = crowns[index];
          return (
            <Box
              component="li"
              key={member.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: 1,
                py: 0.75,
                borderRadius: "10px",
                bgcolor: current ? "rgba(115, 103, 240, 0.12)" : "transparent",
                boxShadow: current ? "inset 0 0 0 1px rgba(115, 103, 240, 0.35)" : "none",
              }}
            >
              {crown ? (
                <Box sx={{ position: "relative", width: 28, height: 28, flexShrink: 0, display: "grid", placeItems: "center" }}>
                  <Crown metal={crown} />
                  <Box
                    component="span"
                    sx={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                      clip: "rect(0, 0, 0, 0)",
                    }}
                  >
                    {index + 1}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1,
                    bgcolor: "action.hover",
                    color: "text.secondary",
                  }}
                >
                  {index + 1}
                </Box>
              )}
              <Typography component="span" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: current ? 700 : 600 }}>
                {member.nickname}
              </Typography>
              {current ? (
                <Typography
                  component="span"
                  sx={{
                    flexShrink: 0,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: "999px",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  You
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
