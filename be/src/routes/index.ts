import { Router } from "express";
import { authRouter } from "./auth";
import { exerciseByIdRouter } from "./exercises";
import { sessionsRouter, sessionSetsRouter } from "./sessions";
import { workoutsRouter } from "./workouts";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/workouts", workoutsRouter);
apiRouter.use("/exercises", exerciseByIdRouter);
apiRouter.use("/sessions", sessionsRouter);
apiRouter.use("/sessions/:sessionId/sets", sessionSetsRouter);
