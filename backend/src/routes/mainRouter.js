// mainRouter.js
const express = require("express");
const router = express.Router();

const salesforceRouter = require("./partners/SalesForce/salesforceRouter");

// Future: Route based on partner, currently only one partner is available
router.use("/salesforce/", salesforceRouter);

module.exports = router;
