import { buildNoticeMail } from "./emails";
import type { OutboundMail } from "./mailer";
import type { SmtpConfig } from "./smtp";
import { decideWaitlistBody, type NewWaitlistSignup } from "./validate";

export type { NewWaitlistSignup };

export type WaitlistDeps = {
  now: Date;
  insertSignup: (signup: NewWaitlistSignup) => Promise<"created" | "duplicate">;
  readMailConfig: () => SmtpConfig | null;
  sendMail: (config: SmtpConfig, mail: OutboundMail) => Promise<void>;
  log: (line: string) => void;
};

export type AcceptResult = {
  status: number;
  body: { ok: true } | { error: string };
};

const success = (): AcceptResult => ({ status: 200, body: { ok: true } });

const errorText = (error: unknown): string => {
  if (error instanceof Error && error.message !== "") {
    return error.message;
  }
  return "unknown error";
};

const deliverMail = async (signup: NewWaitlistSignup, deps: WaitlistDeps): Promise<void> => {
  const config = deps.readMailConfig();
  if (!config) {
    deps.log("Waitlist signup saved; SMTP is not configured, so no email was sent.");
    return;
  }

  if (!config.notifyTo) {
    deps.log("Waitlist signup saved; WAITLIST_NOTIFY_TO is not set, so no notice was sent.");
    return;
  }

  const notice = buildNoticeMail({
    email: signup.email,
    role: signup.role,
    ref: signup.ref,
    consentedAt: signup.consentedAt,
  });
  try {
    await deps.sendMail(config, { ...notice, to: config.notifyTo });
  } catch (error) {
    deps.log(`Waitlist notice email failed: ${errorText(error)}`);
  }
};

export const acceptWaitlist = async (
  body: unknown,
  deps: WaitlistDeps,
): Promise<AcceptResult> => {
  const decision = decideWaitlistBody(body);
  if (decision.kind === "honeypot") {
    return success();
  }
  if (decision.kind === "invalid") {
    return { status: 400, body: { error: decision.error } };
  }

  const signup: NewWaitlistSignup = {
    email: decision.value.email,
    role: decision.value.role,
    ref: decision.value.ref,
    consentedAt: deps.now,
  };
  const inserted = await deps.insertSignup(signup);
  if (inserted === "duplicate") {
    return success();
  }

  await deliverMail(signup, deps);
  return success();
};
