const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const controller = require("./scoring.controller");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN"));

router.post("/applications/:applicationId/calculate", controller.calculate);
router.get("/applications/:applicationId/result", controller.getByApplicationId);

module.exports = router;
