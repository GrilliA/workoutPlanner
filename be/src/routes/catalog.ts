import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  getExerciseCatalogById,
  getExerciseCatalogFacets,
  searchExerciseCatalog,
} from "../services/catalogAccess";

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

catalogRouter.get("/exercises", async (req, res) => {
  const result = await searchExerciseCatalog({
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    muscle: typeof req.query.muscle === "string" ? req.query.muscle : undefined,
    equipment: typeof req.query.equipment === "string" ? req.query.equipment : undefined,
    level: typeof req.query.level === "string" ? req.query.level : undefined,
    limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
    offset: typeof req.query.offset === "string" ? Number(req.query.offset) : undefined,
  });

  res.json(result);
});

catalogRouter.get("/exercises/:id", async (req, res) => {
  const exercise = await getExerciseCatalogById(req.params.id);

  if (!exercise) {
    res.status(404).json({ error: "Catalog exercise not found" });
    return;
  }

  res.json(exercise);
});

catalogRouter.get("/facets", async (_req, res) => {
  res.json(await getExerciseCatalogFacets());
});
