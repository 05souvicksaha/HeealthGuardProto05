import { Router } from "express";
import { asyncRoute, badRequest } from "../lib/errors.mjs";

export function createAIRouter({ authenticate, triageService, aiProvider }) {
  const router = Router();
  router.post("/triage/assess", (request, response, next) => {
    const situation = request.body?.situation;
    if (!situation || String(situation).trim().length < 3) return next(badRequest("Describe the situation with at least three characters."));
    response.json(triageService.assess(situation));
  });
  router.post("/ai/health-assistant", authenticate, asyncRoute(async (request, response) => {
    if (!request.body?.message) throw badRequest("Message is required.");
    response.json(await aiProvider.healthAssistant({ message: request.body.message, history: request.body.history ?? [] }));
  }));
  router.post("/ai/conditions", authenticate, asyncRoute(async (request, response) => {
    if (!request.body?.symptoms) throw badRequest("Symptoms are required.");
    response.json({
      matches: await aiProvider.matchConditions({ symptoms: request.body.symptoms }),
      disclaimer: "Condition matching is probabilistic, is separate from emergency risk assessment, and is not a diagnosis."
    });
  }));
  router.get("/ai/status", (_request, response) => response.json(aiProvider.status()));
  return router;
}

