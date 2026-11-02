import express from "express";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes";
import { applyCors } from "./middleware/cors";
import { errorResponse } from "./middleware/errorResponse";
import { waitlistRouter } from "./waitlist/router";

export const app = express();

// Railway terminates TLS and puts the visitor in X-Forwarded-For.
// One hop makes the waitlist limit per visitor, not per proxy.
app.set("trust proxy", 1);

// Own CORS and a 2kb JSON limit, before the shared parser.
app.use("/api/waitlist", waitlistRouter);
app.use(applyCors);
app.use(express.json());
app.use(cookieParser());
app.use("/api", apiRouter);

app.get("/", (_req, res) => {
  res.send("Workout Planner API");
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const response = errorResponse(err);
    console.error(response.log);
    if (res.headersSent) {
      return;
    }
    res.status(response.status).json(response.body);
  },
);
