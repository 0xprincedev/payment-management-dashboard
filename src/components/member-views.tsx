"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";

export const MemberActionSlot = createContext<HTMLElement | null>(null);

const storageKey = "member-view";

export type MemberPanel = {
  id: number;
  nickname: string;
  table: ReactNode;
};

export default function MemberViews({
  ownId,
  people,
  action,
}: {
  ownId: number;
  people: MemberPanel[];
  action?: ReactNode;
}) {
  const [view, setView] = useState<"list" | "tabs">("tabs");
  const [tab, setTab] = useState(ownId);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const selected = people.some((person) => person.id === tab) ? tab : (people[0]?.id ?? ownId);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "list" || saved === "tabs") setView(saved);
  }, []);

  function changeView(_event: unknown, value: "list" | "tabs" | null) {
    if (!value) return;
    setView(value);
    window.localStorage.setItem(storageKey, value);
  }

  const switchControl = (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={view}
      onChange={changeView}
      aria-label="Member layout"
      sx={{
        ml: "auto",
        p: 0.25,
        bgcolor: "action.hover",
        borderRadius: "999px",
        "& .MuiToggleButtonGroup-grouped": {
          border: 0,
          borderRadius: "999px !important",
          mx: 0,
          px: 1.75,
          py: 0.6,
          textTransform: "none",
          fontWeight: 600,
          lineHeight: 1.4,
          color: "text.secondary",
          "&.Mui-selected": {
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { bgcolor: "primary.main" },
          },
          "&:hover": { bgcolor: "action.selected" },
        },
      }}
    >
      <ToggleButton value="list" type="button">
        List
      </ToggleButton>
      <ToggleButton value="tabs" type="button">
        Tabs
      </ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <MemberActionSlot.Provider value={slot}>
      <Box
        sx={{
          mt: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box ref={setSlot}>{action}</Box>
        {switchControl}
      </Box>
      {view === "tabs" ? (
        <Box sx={{ mt: 2 }}>
          <Tabs
            value={selected}
            onChange={(_event, value: number) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Group members"
          >
            {people.map((person) => (
              <Tab key={person.id} value={person.id} label={person.nickname} />
            ))}
          </Tabs>
          {people.map((person) => {
            const visible = person.id === selected;
            if (!visible && person.id !== ownId) return null;
            return (
              <Box key={person.id} sx={visible ? undefined : { display: "none" }}>
                {person.table}
              </Box>
            );
          })}
        </Box>
      ) : (
        people.map((person) => (
          <Box key={person.id} sx={{ mt: person.id === ownId ? 0 : 5 }}>
            {person.id === ownId ? null : (
              <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                {person.nickname}
              </Typography>
            )}
            {person.table}
          </Box>
        ))
      )}
    </MemberActionSlot.Provider>
  );
}
