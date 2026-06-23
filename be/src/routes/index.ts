import { Router } from "express";
import { workoutsRouter } from "./workouts";

export const apiRouter = Router();

apiRouter.use("/workouts", workoutsRouter);
