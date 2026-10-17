import express, { Router, type Request, type Response } from "express";
import { acceptWaitlist } from "./accept";
import { handleWaitlistBodyError, MAX_WAITLIST_BODY_BYTES, rejectLargeWaitlistBody } from "./bodyLimit";
import { applyWaitlistCors } from "./cors";
import { sendWaitlistMail } from "./mailer";
import { waitlistRateLimit } from "./rateLimit";
import { readSmtpConfig } from "./smtp";
import { insertWaitlistSignup } from "./store";

const postWaitlist = async (req: Request, res: Response): Promise<void> => {
  const result = await acceptWaitlist(req.body, {
    now: new Date(),
    insertSignup: insertWaitlistSignup,
    readMailConfig: () => readSmtpConfig(process.env),
    sendMail: sendWaitlistMail,
    log: (line) => {
      console.warn(line);
    },
  });
  res.status(result.status).json(result.body);
};

export const waitlistRouter = Router();

waitlistRouter.use(applyWaitlistCors);
waitlistRouter.use(waitlistRateLimit);
waitlistRouter.use(rejectLargeWaitlistBody);
waitlistRouter.use(express.json({ limit: MAX_WAITLIST_BODY_BYTES }));
waitlistRouter.post("/", postWaitlist);
waitlistRouter.use(handleWaitlistBodyError);
waitlistRouter.use((_req, res) => {
  res.status(404).json({ error: "Non trovato" });
});
