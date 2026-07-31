import { Router } from "express";
import { authRouter } from "./auth";
import { catalogRouter } from "./catalog";
import { coachRouter } from "./coach";
import { exerciseByIdRouter } from "./exercises";
import { sessionsRouter, sessionSetsRouter } from "./sessions";
import { statsRouter } from "./stats";
import { workoutsRouter } from "./workouts";
import { assignmentsRouter } from "./assignments";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/coach", coachRouter);
apiRouter.use("/assignments", assignmentsRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/workouts", workoutsRouter);
apiRouter.use("/exercises", exerciseByIdRouter);
apiRouter.use("/sessions", sessionsRouter);
apiRouter.use("/sessions/:sessionId/sets", sessionSetsRouter);
apiRouter.use("/stats", statsRouter);
