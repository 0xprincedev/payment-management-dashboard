"use client";

import Box from "@mui/material/Box";
import type { DragEvent, PointerEvent } from "react";

const dots = [
  [4, 5],
  [10, 5],
  [4, 12],
  [10, 12],
  [4, 19],
  [10, 19],
];

export default function DragHandle({
  disabled,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDragStart,
  onDragEnd,
}: {
  disabled?: boolean;
  dragging?: boolean;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-label="Drag to reorder"
      draggable={!disabled}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      sx={{
        display: "grid",
        placeItems: "center",
        width: 28,
        height: 32,
        p: 0,
        border: 0,
        borderRadius: "6px",
        color: "text.disabled",
        bgcolor: "transparent",
        cursor: disabled ? "default" : dragging ? "grabbing" : "grab",
        touchAction: "none",
        "&:hover": { bgcolor: "action.hover", color: "text.secondary" },
      }}
    >
      <Box component="svg" viewBox="0 0 14 24" width="14" height="22" aria-hidden>
        {dots.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" fill="currentColor" />
        ))}
      </Box>
    </Box>
  );
}
