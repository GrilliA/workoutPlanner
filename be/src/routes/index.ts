import { Router } from "express";
import { exerciseByIdRouter } from "./exercises";
import { workoutsRouter } from "./workouts";

export const apiRouter = Router();

apiRouter.use("/workouts", workoutsRouter);
apiRouter.use("/exercises", exerciseByIdRouter);
