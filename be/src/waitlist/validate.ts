import { WAITLIST_ROLES, type WaitlistRole } from "./schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REF_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_EMAIL_LENGTH = 254;

export type WaitlistSignupInput = {
  email: string;
  role: WaitlistRole;
  ref: string | null;
};

export type NewWaitlistSignup = WaitlistSignupInput & {
  consentedAt: Date;
};

export type WaitlistDecision =
  | { kind: "honeypot" }
  | { kind: "invalid"; error: string }
  | { kind: "signup"; value: WaitlistSignupInput };

export const normalizeWaitlistEmail = (email: string): string => email.trim().toLowerCase();

export const isHoneypotFilled = (company: unknown): boolean => {
  if (company === undefined || company === null) {
    return false;
  }
  if (typeof company !== "string") {
    return true;
  }
  return company.trim() !== "";
};

const isConsentGiven = (consent: unknown): boolean => {
  if (consent === true) {
    return true;
  }
  return consent === "true" || consent === "yes" || consent === "on";
};

const isRole = (role: unknown): role is WaitlistRole =>
  typeof role === "string" && WAITLIST_ROLES.some((allowed) => allowed === role);

const readRef = (
  ref: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } => {
  if (ref === undefined || ref === null) {
    return { ok: true, value: null };
  }
  if (typeof ref !== "string") {
    return { ok: false, error: "Il codice invito non è valido" };
  }
  const trimmed = ref.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (!REF_PATTERN.test(trimmed)) {
    return { ok: false, error: "Il codice invito non è valido" };
  }
  return { ok: true, value: trimmed };
};

export const decideWaitlistBody = (body: unknown): WaitlistDecision => {
  if (!body || typeof body !== "object") {
    return { kind: "invalid", error: "Richiesta non valida" };
  }

  const record = body as Record<string, unknown>;
  if (isHoneypotFilled(record.company)) {
    return { kind: "honeypot" };
  }

  if (typeof record.email !== "string") {
    return { kind: "invalid", error: "Inserisci un indirizzo email valido" };
  }
  const email = normalizeWaitlistEmail(record.email);
  const emailIsValid = email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
  if (!emailIsValid) {
    return { kind: "invalid", error: "Inserisci un indirizzo email valido" };
  }

  if (!isRole(record.role)) {
    return { kind: "invalid", error: "Scegli se sei coach o atleta" };
  }

  if (!isConsentGiven(record.consent)) {
    return { kind: "invalid", error: "Serve il consenso per iscriverti" };
  }

  const ref = readRef(record.ref);
  if (!ref.ok) {
    return { kind: "invalid", error: ref.error };
  }

  return {
    kind: "signup",
    value: { email, role: record.role, ref: ref.value },
  };
};
