export type SmtpConfig = {
  host: string;
  port: number;
  user: string | null;
  password: string | null;
  from: string;
  notifyTo: string | null;
};

const trimmed = (value: string | undefined): string => (value ?? "").trim();

/**
 * SMTP is optional. A missing host or from-address means "not configured":
 * the signup is still stored and the caller logs a warning.
 */
export const readSmtpConfig = (env: NodeJS.ProcessEnv): SmtpConfig | null => {
  const host = trimmed(env.SMTP_HOST);
  const from = trimmed(env.SMTP_FROM);
  if (host === "" || from === "") {
    return null;
  }

  const portText = trimmed(env.SMTP_PORT);
  const port = portText === "" ? 587 : Number(portText);
  const portIsValid = Number.isInteger(port) && port > 0 && port <= 65535;
  if (!portIsValid) {
    return null;
  }

  const user = trimmed(env.SMTP_USER);
  const notifyTo = trimmed(env.WAITLIST_NOTIFY_TO);
  return {
    host,
    port,
    user: user === "" ? null : user,
    password: user === "" ? null : (env.SMTP_PASS ?? ""),
    from,
    notifyTo: notifyTo === "" ? null : notifyTo,
  };
};
