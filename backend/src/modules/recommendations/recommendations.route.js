import { Router } from "express";
import {
  getRecommendations,
  generateRecommendations,
  implementRecommendation,
  rollbackRecommendation,
  dismissRecommendation,
} from "./recommendations.controller.js";

const router = Router({ mergeParams: true });

// GET /teams/:teamId/aws-accounts/:internalAccountId/recommendations
router.get("/", getRecommendations);

// POST /teams/:teamId/aws-accounts/:internalAccountId/recommendations/generate
router.post("/generate", generateRecommendations);

// POST /teams/:teamId/aws-accounts/:internalAccountId/recommendations/:recommendationId/implement
router.post("/:recommendationId/implement", implementRecommendation);

// POST /teams/:teamId/aws-accounts/:internalAccountId/recommendations/:recommendationId/rollback
router.post("/:recommendationId/rollback", rollbackRecommendation);

// PATCH /teams/:teamId/aws-accounts/:internalAccountId/recommendations/:recommendationId/dismiss
router.patch("/:recommendationId/dismiss", dismissRecommendation);

export const recommendationRoutes = router;
