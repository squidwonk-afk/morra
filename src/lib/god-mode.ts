/** Unlimited credits and tool access for the reserved `god` account (by username). */
export function isGodUsername(username: string | null | undefined): boolean {
  return (username ?? "").trim().toLowerCase() === "god";
}
