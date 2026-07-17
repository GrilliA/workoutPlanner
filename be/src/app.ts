import express from "express";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes";
import { applyCors } from "./middleware/cors";

export const app = express();

app.use(applyCors);
app.use(express.json());
app.use(cookieParser());
app.use("/api", apiRouter);

app.get("/", (_req, res) => {
  res.send("Workout Planner API");
});
