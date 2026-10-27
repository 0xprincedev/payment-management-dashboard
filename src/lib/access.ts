export function isBoss(role: string) {
  return role === "Boss";
}

export function isAdmin(role: string) {
  return role === "Admin";
}

export function isAdminGroupName(name: string) {
  return name.trim().toLocaleLowerCase() === "admin";
}
