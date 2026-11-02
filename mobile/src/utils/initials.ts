/** "MB" da "Marco Bianchi"; "?" senza nome. Avatar di Home e Account. */
export const formatInitials = (fullName: string | null | undefined): string => {
  const parts = (fullName ?? "").trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};
