import { Router } from "express";
import {
  getRecommendations,
  generateRecommendations,
  implementRecommendation,
  rollbackRecommendation,
  dismissRecommendation,
} from "./recommendations.controller.js";

const router = Router({ mergeParams: true });

// GET /teams/:teamId/aws-accounts/:accountId/recommendations
router.get("/", getRecommendations);

// POST /teams/:teamId/aws-accounts/:accountId/recommendations/generate
router.post("/generate", generateRecommendations);

// POST /teams/:teamId/aws-accounts/:accountId/recommendations/:id/implement
router.post("/:id/implement", implementRecommendation);

// POST /teams/:teamId/aws-accounts/:accountId/recommendations/:id/rollback
router.post("/:id/rollback", rollbackRecommendation);

// PATCH /teams/:teamId/aws-accounts/:accountId/recommendations/:id/dismiss
router.patch("/:id/dismiss", dismissRecommendation);

export const recommendationRoutes = router;
