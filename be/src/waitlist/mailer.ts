import nodemailer from "nodemailer";
import type { SmtpConfig } from "./smtp";

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export const sendWaitlistMail = async (
  config: SmtpConfig,
  mail: OutboundMail,
): Promise<void> => {
  const auth =
    config.user === null
      ? undefined
      : { user: config.user, pass: config.password ?? "" };
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth,
  });
  await transport.sendMail({
    from: config.from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
};
