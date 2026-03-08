import * as anomalyService from "./anomaly.service.js";

export const getAnomalies = async (req, res, next) => {
  try {
    const anomalies = await anomalyService.getAnomalies(req.awsAccount.id);
    return res.status(200).send({ anomalies });
  } catch (err) {
    next(err);
  }
};

export const triggerAnalysis = async (req, res, next) => {
  try {
    const result = await anomalyService.triggerAnalysis(req.awsAccount.id);
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};
