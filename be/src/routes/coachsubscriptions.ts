import { Router, type Request, type Response } from "express";
import { todayInRome } from "../services/assignmentStatus";
import { findCoachAthleteLink } from "../services/coachAthleteAccess";
import {
  createOffer,
  createPause,
  findSubscription,
  listOffers,
  listPayments,
  loadPaymentPreview,
  loadSubscriptionDetail,
  recordPayment,
  removeActivePause,
  saveSubscription,
  undoPayment,
  updateOffer,
} from "../services/subscriptionAccess";
import {
  isDatabaseId,
  validateOfferInput,
  validateOfferPatch,
  validatePauseInput,
  validatePaymentInput,
  validatePaymentPreviewQuery,
  validateSubscriptionInput,
} from "../services/subscriptionValidation";
import { getAuthUser } from "../types/auth";

/** Price list, subscription, payments and pause. Mounted inside `coachRouter`, after its auth. */
export const coachSubscriptionsRouter = Router();

/** Sends 400 and returns null unless `:athleteId` is a database id. */
const parseAthleteId = (req: Request, res: Response): number | null => {
  const athleteId = Number(req.params.athleteId);

  if (!isDatabaseId(athleteId)) {
    res.status(400).json({ error: "Invalid athlete id" });
    return null;
  }

  return athleteId;
};

/**
 * Sends 400 or 404 and returns null unless the athlete is linked to this coach.
 * Writes check the link again under lock: this early check only keeps the order of the errors.
 */
export const findClientAthleteId = async (req: Request, res: Response): Promise<number | null> => {
  const athleteId = parseAthleteId(req, res);

  if (athleteId === null) {
    return null;
  }

  const coach = getAuthUser(req);
  const link = await findCoachAthleteLink(coach.id, athleteId);

  if (!link) {
    res.status(404).json({ error: "Client not found" });
    return null;
  }

  return athleteId;
};

/**
 * Like `findClientAthleteId`, but an ex client with a stored subscription keeps their history.
 * `isFormerClient` tells the reads that writes would answer 404.
 */
const findClientOrFormerClient = async (
  req: Request,
  res: Response,
): Promise<{ athleteId: number; isFormerClient: boolean } | null> => {
  const athleteId = parseAthleteId(req, res);

  if (athleteId === null) {
    return null;
  }

  const coach = getAuthUser(req);
  const [link, subscription] = await Promise.all([
    findCoachAthleteLink(coach.id, athleteId),
    findSubscription(coach.id, athleteId),
  ]);

  if (link === null && subscription === null) {
    res.status(404).json({ error: "Client not found" });
    return null;
  }

  return { athleteId, isFormerClient: link === null };
};

coachSubscriptionsRouter.get("/offers", async (req, res) => {
  const coach = getAuthUser(req);
  const offers = await listOffers(coach.id);
  res.json(offers);
});

coachSubscriptionsRouter.post("/offers", async (req, res) => {
  const coach = getAuthUser(req);
  const parsed = validateOfferInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const offer = await createOffer(coach.id, parsed.value);
  res.status(201).json(offer);
});

coachSubscriptionsRouter.patch("/offers/:id", async (req, res) => {
  const coach = getAuthUser(req);
  const offerId = Number(req.params.id);

  if (!isDatabaseId(offerId)) {
    res.status(400).json({ error: "Invalid offer id" });
    return;
  }

  const parsed = validateOfferPatch(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const offer = await updateOffer(coach.id, offerId, parsed.value);

  if (!offer) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  res.json(offer);
});

coachSubscriptionsRouter.get("/clients/:athleteId/subscription", async (req, res) => {
  const client = await findClientOrFormerClient(req, res);

  if (client === null) {
    return;
  }

  const coach = getAuthUser(req);
  const detail = await loadSubscriptionDetail(
    coach.id,
    client.athleteId,
    todayInRome(),
    client.isFormerClient,
  );
  res.json(detail);
});

coachSubscriptionsRouter.put("/clients/:athleteId/subscription", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const parsed = validateSubscriptionInput(req.body);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const saved = await saveSubscription(coach.id, athleteId, parsed.value, todayInRome());

  if (!saved.ok) {
    res.status(saved.status).json({ error: saved.error });
    return;
  }

  const status = saved.value.isCreated ? 201 : 200;
  res.status(status).json(saved.value.detail);
});

coachSubscriptionsRouter.get("/clients/:athleteId/payments/preview", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const parsed = validatePaymentPreviewQuery(req.query, todayInRome());

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const preview = await loadPaymentPreview(coach.id, athleteId, parsed.value);

  if (!preview.ok) {
    res.status(preview.status).json({ error: preview.error });
    return;
  }

  res.json(preview.value);
});

coachSubscriptionsRouter.get("/clients/:athleteId/payments", async (req, res) => {
  const client = await findClientOrFormerClient(req, res);

  if (client === null) {
    return;
  }

  const coach = getAuthUser(req);
  const payments = await listPayments(
    coach.id,
    client.athleteId,
    todayInRome(),
    client.isFormerClient,
  );
  res.json(payments);
});

coachSubscriptionsRouter.post("/clients/:athleteId/payments", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const today = todayInRome();
  const parsed = validatePaymentInput(req.body, today);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const recorded = await recordPayment(coach.id, athleteId, parsed.value, today);

  if (!recorded.ok) {
    res.status(recorded.status).json({ error: recorded.error });
    return;
  }

  res.status(201).json(recorded.value);
});

// Both ids come before the link, and there is no body: the link is checked only under lock.
coachSubscriptionsRouter.delete("/clients/:athleteId/payments/:id", async (req, res) => {
  const athleteId = parseAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const paymentId = Number(req.params.id);

  if (!isDatabaseId(paymentId)) {
    res.status(400).json({ error: "Invalid payment id" });
    return;
  }

  const coach = getAuthUser(req);
  const undone = await undoPayment(coach.id, athleteId, paymentId, todayInRome());

  if (!undone.ok) {
    res.status(undone.status).json({ error: undone.error });
    return;
  }

  res.status(204).end();
});

coachSubscriptionsRouter.post("/clients/:athleteId/pause", async (req, res) => {
  const athleteId = await findClientAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const today = todayInRome();
  const parsed = validatePauseInput(req.body, today);

  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const coach = getAuthUser(req);
  const created = await createPause(coach.id, athleteId, parsed.value, today);

  if (!created.ok) {
    res.status(created.status).json({ error: created.error });
    return;
  }

  res.status(201).json(created.value);
});

// No body: the link is checked only under lock.
coachSubscriptionsRouter.delete("/clients/:athleteId/pause", async (req, res) => {
  const athleteId = parseAthleteId(req, res);

  if (athleteId === null) {
    return;
  }

  const coach = getAuthUser(req);
  const removed = await removeActivePause(coach.id, athleteId, todayInRome());

  if (!removed.ok) {
    res.status(removed.status).json({ error: removed.error });
    return;
  }

  res.status(204).end();
});
