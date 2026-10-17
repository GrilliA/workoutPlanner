import type { WaitlistRole } from "./schema";

const PRIVACY_LINE =
  "Usiamo questo indirizzo solo per la lista d'attesa e per avvisarti del lancio. Per cancellarlo, rispondi a questa email. TODO: informativa privacy completa e titolare del trattamento.";

export type MailContent = {
  subject: string;
  text: string;
  html: string;
};

export type WaitlistNotice = {
  email: string;
  role: WaitlistRole;
  ref: string | null;
  consentedAt: Date;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const roleLabel = (role: WaitlistRole): string => {
  if (role === "coach") {
    return "Coach o PT";
  }
  return "Atleta";
};

const solePage = (bodyHtml: string): string => `<!doctype html>
<html lang="it">
  <body style="margin:0;background:#FFF8F1;color:#231A14;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F1;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:24px;">
            <tr>
              <td style="padding:32px 28px;font-size:16px;line-height:1.5;color:#231A14;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const buildWelcomeMail = (): MailContent => {
  const subject = "Sei in lista per Traccia";
  const text = [
    "Sei in lista.",
    "",
    "Ti scriviamo quando apre il test chiuso su Android. Fino ad allora non ti mandiamo altre email.",
    "",
    PRIVACY_LINE,
  ].join("\n");
  const html = solePage(`
    <p style="margin:0 0 18px;font-size:22px;font-weight:800;letter-spacing:-0.03em;">tracci<span style="color:#A33A12;">a</span></p>
    <p style="margin:0 0 16px;display:inline-block;background:#FF7A45;color:#231A14;font-weight:700;border-radius:999px;padding:8px 14px;">Sei in lista</p>
    <h1 style="margin:16px 0 12px;font-size:28px;line-height:1.15;letter-spacing:-0.03em;">La prossima scheda la apri in Traccia.</h1>
    <p style="margin:0 0 16px;color:#6F625A;">Ti scriviamo quando apre il test chiuso su Android. Fino ad allora non ti mandiamo altre email.</p>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.45;color:#6F625A;">${escapeHtml(PRIVACY_LINE)}</p>
  `);
  return { subject, text, html };
};

export const buildNoticeMail = (notice: WaitlistNotice): MailContent => {
  const referral = notice.ref ?? "nessuno";
  const role = roleLabel(notice.role);
  const subject = "Nuova iscrizione alla lista d'attesa";
  const text = [
    "Nuova iscrizione alla lista d'attesa.",
    "",
    `Email: ${notice.email}`,
    `Ruolo: ${role}`,
    `Codice invito: ${referral}`,
    `Consenso: ${notice.consentedAt.toISOString()}`,
  ].join("\n");
  const html = solePage(`
    <p style="margin:0 0 18px;font-size:22px;font-weight:800;letter-spacing:-0.03em;">tracci<span style="color:#A33A12;">a</span></p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Nuova iscrizione</h1>
    <p style="margin:0 0 8px;"><b>Email</b><br>${escapeHtml(notice.email)}</p>
    <p style="margin:0 0 8px;"><b>Ruolo</b><br>${escapeHtml(role)}</p>
    <p style="margin:0 0 8px;"><b>Codice invito</b><br>${escapeHtml(referral)}</p>
    <p style="margin:0;"><b>Consenso</b><br>${escapeHtml(notice.consentedAt.toISOString())}</p>
  `);
  return { subject, text, html };
};
