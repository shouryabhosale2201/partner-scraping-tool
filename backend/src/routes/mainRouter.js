// mainRouter.js
const express = require("express");
const router = express.Router();

const salesforceRouter = require("./partners/SalesForce/salesforceRouter");
const oracleRouter = require("./partners/Oracle/oracleRouter");
const shopifyRouter = require("./partners/Shopify/shopifyRouter");
const microsoftRouter = require("./partners/Microsoft/microsoftRouter");

// Future: Route based on partner, currently only one partner is available
router.use("/salesforce/", salesforceRouter);
router.use("/oracle/", oracleRouter);
router.use("/shopify/", shopifyRouter);
router.use("/microsoft/",microsoftRouter);

module.exports = router;
