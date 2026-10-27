import type { KeyboardEvent } from "react";

export function submitFormOnEnter(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.tagName === "TEXTAREA" || target.isContentEditable) return;
  if (target.closest("[role='listbox']")) return;
  if (target.getAttribute("role") === "combobox") return;
  if (target.closest("button, a")) return;

  event.preventDefault();
  event.currentTarget.requestSubmit();
}
