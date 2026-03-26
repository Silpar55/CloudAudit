import * as anomalyService from "./anomaly.service.js";
import * as authModel from "#modules/auth/auth.model.js";

export const getAnomalies = async (req, res, next) => {
  try {
    const anomalies = await anomalyService.getAnomalies(req.awsAccount);
    return res.status(200).send({ anomalies });
  } catch (err) {
    next(err);
  }
};

export const triggerAnalysis = async (req, res, next) => {
  try {
    const actor = await authModel.findUserById(req.userId);
    const actorName =
      [actor?.first_name, actor?.last_name].filter(Boolean).join(" ") ||
      actor?.email ||
      "User";

    const result = await anomalyService.triggerAnalysis(
      req.awsAccount,
      req.userId,
      actorName,
    );
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const dismissAnomaly = async (req, res, next) => {
  try {
    const { anomalyId } = req.params;
    const { note } = req.body ?? {};
    const anomaly = await anomalyService.dismissAnomaly(
      req.awsAccount,
      anomalyId,
      note,
    );
    return res.status(200).send({
      message: "Anomaly dismissed",
      anomaly,
    });
  } catch (err) {
    next(err);
  }
};

export const resolveAnomaly = async (req, res, next) => {
  try {
    const { anomalyId } = req.params;
    const { note } = req.body ?? {};
    const anomaly = await anomalyService.resolveAnomaly(
      req.awsAccount,
      anomalyId,
      note,
    );
    return res.status(200).send({
      message: "Anomaly resolved",
      anomaly,
    });
  } catch (err) {
    next(err);
  }
};
