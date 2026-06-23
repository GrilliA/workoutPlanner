import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { workouts } from "../db/schema";

export const workoutsRouter = Router();

workoutsRouter.get("/", async (_req, res) => {
  const all = await db.select().from(workouts);
  res.json(all);
});

workoutsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid workout id" });
    return;
  }

  const [workout] = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, id));

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  res.json(workout);
});

workoutsRouter.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [created] = await db.insert(workouts).values({ name }).returning();
  res.status(201).json(created);
});
