import * as recommendationsService from "./recommendations.service.js";
import { formatRecommendationForUI } from "#utils/formatters.js";

export const getRecommendations = async (req, res, next) => {
  try {
    const rawRecommendations = await recommendationsService.getRecommendations(
      req.awsAccount,
    );

    // FORMATTING FOR UI: Map raw DB rows to clean objects
    const recommendations = rawRecommendations.map(formatRecommendationForUI);

    return res.status(200).send({ recommendations });
  } catch (err) {
    next(err);
  }
};

export const generateRecommendations = async (req, res, next) => {
  try {
    const result = await recommendationsService.runDetectionCycle(
      req.awsAccount,
    );
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const implementRecommendation = async (req, res, next) => {
  try {
    const { recommendationId } = req.params;
    const result = await recommendationsService.implementRecommendation(
      req.awsAccount,
      recommendationId,
      req.userId,
    );

    // Format the returned recommendation for the UI state update
    if (result.recommendation) {
      result.recommendation = formatRecommendationForUI(result.recommendation);
    }

    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const resolveRecommendation = async (req, res, next) => {
  try {
    const { recommendationId } = req.params;
    const result = await recommendationsService.resolveRecommendation(
      req.awsAccount,
      recommendationId,
      req.userId,
    );

    if (result.recommendation) {
      result.recommendation = formatRecommendationForUI(result.recommendation);
    }

    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const rollbackRecommendation = async (req, res, next) => {
  try {
    const { recommendationId } = req.params;
    const result = await recommendationsService.rollbackRecommendation(
      req.awsAccount,
      recommendationId,
      req.userId,
    );

    if (result.recommendation) {
      result.recommendation = formatRecommendationForUI(result.recommendation);
    }

    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const dismissRecommendation = async (req, res, next) => {
  try {
    const { recommendationId } = req.params;
    const result = await recommendationsService.dismissRecommendation(
      req.awsAccount,
      recommendationId,
    );

    if (result.recommendation) {
      result.recommendation = formatRecommendationForUI(result.recommendation);
    }

    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};
