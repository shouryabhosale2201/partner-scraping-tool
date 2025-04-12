// mainRouter.js
const express = require("express");
const router = express.Router();

const salesforceRouter = require("./partners/SalesForce/salesforceRouter");
const oracleRouter = require("./partners/Oracle/oracleRouter");

// Future: Route based on partner, currently only one partner is available
router.use("/salesforce/", salesforceRouter);
router.use("/oracle/", oracleRouter);

module.exports = router;
