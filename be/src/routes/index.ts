import { Router } from "express";
import { authRouter } from "./auth";
import { exerciseByIdRouter } from "./exercises";
import { workoutsRouter } from "./workouts";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/workouts", workoutsRouter);
apiRouter.use("/exercises", exerciseByIdRouter);
