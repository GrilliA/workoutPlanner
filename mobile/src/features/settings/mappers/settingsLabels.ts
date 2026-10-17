import type { AthleteCoach } from "../../../api";

/** "Luca R." dal nome del coach, l'email se il nome manca. */
export const formatCoachName = (coach: AthleteCoach): string => {
  const parts = (coach.name ?? "").trim().split(/\s+/).filter((part) => part.length > 0);
  const firstName = parts[0];
  if (!firstName) {
    return coach.email;
  }
  const lastName = parts[1];
  if (!lastName) {
    return firstName;
  }
  return `${firstName} ${lastName[0]?.toUpperCase()}.`;
};
