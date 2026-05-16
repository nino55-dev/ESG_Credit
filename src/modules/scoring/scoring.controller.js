const ApiResponse = require("../../utils/apiResponse");

const scoringService = require("./scoring.service");

module.exports = {
  calculate: async (req, res, next) => {
    try {
      const data = await scoringService.calculate(req.params.applicationId);
      return ApiResponse.success(res, data, "Bilan ESG calculé avec succès.");
    } catch (error) {
      return next(error);
    }
  },
  getByApplicationId: async (req, res, next) => {
    try {
      const data = await scoringService.getByApplicationId(req.params.applicationId);
      return ApiResponse.success(res, data, "Bilan ESG récupéré avec succès.");
    } catch (error) {
      return next(error);
    }
  },
};
