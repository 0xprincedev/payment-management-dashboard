const sameGroupColor = "70AD47";

const otherGroupColors: Record<number, string> = {
  1: "7EADD6",
  2: "B09ACB",
  3: "E4C56E",
  4: "7EBEB6",
  5: "E0A8B6",
  6: "A3AEBB",
};

export function internalColor(groupId: number, ownGroupId: number) {
  if (groupId === ownGroupId) return sameGroupColor;
  const palette = Object.values(otherGroupColors);
  return otherGroupColors[groupId] ?? palette[(Math.abs(groupId) - 1) % palette.length];
}

export function internalLightText(_groupId: number, _ownGroupId: number) {
  return false;
}
