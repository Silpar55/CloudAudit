import * as recommendationsService from "./recommendations.service.js";

export const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await recommendationsService.getRecommendations(
      req.awsAccount,
    );
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
    const { id } = req.params;
    const result = await recommendationsService.implementRecommendation(
      req.awsAccount,
      id,
      req.userId,
    );
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const rollbackRecommendation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await recommendationsService.rollbackRecommendation(
      req.awsAccount,
      id,
      req.userId,
    );
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const dismissRecommendation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await recommendationsService.dismissRecommendation(
      req.awsAccount,
      id,
    );
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};
