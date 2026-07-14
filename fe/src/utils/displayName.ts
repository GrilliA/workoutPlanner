import type { AuthUser } from "@auth";

export const getDisplayName = (user: AuthUser | null | undefined): string => {
  if (!user) {
    return "";
  }

  const name = user.name?.trim();

  if (name) {
    return name;
  }

  return user.email;
};

export const getAvatarInitial = (displayName: string): string => {
  const trimmed = displayName.trim();

  if (!trimmed) {
    return "?";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  return trimmed.charAt(0).toUpperCase();
};
